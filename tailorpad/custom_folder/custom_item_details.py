from __future__ import unicode_literals
import frappe
from frappe.utils import cstr, cint, flt
from frappe import _, throw, msgprint
from frappe.model.meta import get_field_precision
from erpnext.stock.get_item_details import process_args, validate_item_details, \
    get_basic_details, get_price_list_rate, get_price_list_rate_for
from tailorpad.custom_folder.custom_selling import get_fabric_qty
from tailorpad.custom_folder.custom_stock import get_user_warehouse, get_user_branch
from tailorpad.admin.doctype.style_template.style_template import make_style_name

precesion = frappe.db.get_value('System Settings', None, 'float_precesion')
@frappe.whitelist()
def calculate_total_amt(args):
    args = process_args(args)
    item_doc = frappe.get_doc("Item", args.item_code)
    item = item_doc
    validate_item_details(args, item)
    out = get_basic_details(args, item)
    #out = "Item"
    get_price_list_rate(args, item_doc, out)
    out.service_rate = out.price_list_rate * flt(args.conversion_rate) if out.price_list_rate else args.service_rate
    out.fabric_item_code = args.fabric_item_code or ''
    get_fabric_rate(args, out)
    out.qty = args.qty or 1.0
    out.fabric_qty = get_fabric_qty(out.item_code, args.size, args.width) * (args.qty or 1.0)
    get_total_fabric_price(args, out)
    get_total_service_price(args, out)
    out.price_list_rate = out.rate = ((out.total_fabric_price + out.total_service_rate) / flt(out.qty)) * flt(args.conversion_rate)
    out.size = args.size or frappe.db.get_value('Customer', args.customer, 'size')
   # frappe.throw("LAST" + str(out))
    return out

def get_fabric_rate(args, out):
    out.fabric_rate = 0.0
    if out.fabric_item_code:
        out.fabric_rate = flt(get_price_list_rate_for(args.price_list, out.fabric_item_code)) * flt(args.conversion_rate)
    return

def get_total_fabric_price(args, out):
    out.total_fabric_price = calculate_amt(out.fabric_rate, flt(out.fabric_qty)) * flt(args.conversion_rate) or 0.0
    return

def get_total_service_price(args, out):
    out.total_service_rate = calculate_amt(out.service_rate, out.qty) * flt(args.conversion_rate) or 0.0
    return

def calculate_amt(price_list_rate, qty):
    return flt(price_list_rate, precesion) * flt(qty, precesion)


def update_events(doc, method):

    if doc.meta.get_field('product_bundle_item'):
        validate_product_bundle(doc)
        create_product_bundle(doc)
    update_employee_piece_rate(doc)
    update_style_fields(doc)
    if not doc.barcode:
        doc.db_set('barcode', doc.name)

def update_style_fields(doc):
    for d in doc.style_fields:
        name = frappe.db.get_value('Style Name', d.style_name, 'name')
        if not name:
            make_style_name(d.style_field, d.style_name)

def validate_product_bundle(doc):
    if cint(doc.is_stock_item) == 1 and doc.product_bundle_item:
        frappe.throw(_('Stock item did not have product bundle'))

def update_employee_piece_rate(doc):
    for data in doc.operations:
        if data.employees:
            employee_data = data.employees.split('\n')
            for employee in employee_data:        
                name = frappe.db.get_value('Employee Skill', 
                    {'parent': employee, 'operation': data.operation, 'item_code': doc.name}, 'name')
                if not name:
                    emp_doc = frappe.get_doc('Employee', employee)
                    emp_doc.append('skills', {
                        'item_code': doc.name,
                        'operation': data.operation,
                        'operation_time': data.time_in_mins,
                        'wage': data.hour_rate,
                        'payment_type': 'Amount'
                    })
                    emp_doc.save()
                else:
                    frappe.db.set_value('Employee Skill', name, 'wage', data.hour_rate)
                    frappe.db.set_value('Employee Skill', name, 'operation_time', data.time_in_mins)

def create_product_bundle(doc):
    name = frappe.db.get_value('Product Bundle', doc.name, 'name')
    if doc.product_bundle_item and not name:
        pb = frappe.get_doc({
            'doctype': 'Product Bundle',
            'new_item_code': doc.name
        })
        get_product_bundle_item(doc.product_bundle_item, pb)
        pb.save(ignore_permissions=True)
    elif name:
        pb = frappe.get_doc("Product Bundle", name)
        update_product_bundle(doc, pb)

def enable_serial_no_for_tailoring(doc):
    if (doc.item_group in ['Tailoring', 'Products'] and not doc.product_bundle_item
            and not doc.has_serial_no and doc.is_new()):
        doc.has_serial_no = 1

    if doc.product_bundle_item:
        doc.has_serial_no = 0     

def update_product_bundle(doc, pb):
    pb.set('items', [])
    get_product_bundle_item(doc.product_bundle_item, pb)
    pb.save(ignore_permissions=True)

def get_product_bundle_item(items, obj):
    for data in items:
        validate_parent(data.item_code, obj.new_item_code)
        pb = obj.append('items', {})
        pb.item_code = data.item_code
        pb.qty = data.qty
        pb.description = data.description

def validate_parent(child, parent):
    if parent == child:
        frappe.throw(_("In clubbed product, Parent must not be child item"))

@frappe.whitelist()
def get_bom_material_detail(item_code):
    """ Get raw material details like uom, desc and rate"""
    item = get_item_det(item_code)
    rate = get_rm_rate(item_code)
    ret_item = {
         'item_name'    : item.get('item_name')  or '',
         'description'  : item.get('description')  or '',
         'image'        : item.get('image')  or '',
         'stock_uom'    : item.get('stock_uom')  or '',
         'uom'    :     item.get('stock_uom')  or '',
         'qty'    :     1,
         'stock_qty': 1,
         'rate'         : rate
    }
    return ret_item

def get_item_det(item_code):
    item = frappe.db.sql("""select name, item_name, is_purchase_item,
        docstatus, description, image, is_sub_contracted_item, stock_uom, default_bom,
        last_purchase_rate
        from `tabItem` where name=%s""", item_code, as_dict = 1)

    if not item:
        frappe.throw(_("Item: {0} does not exist in the system").format(item_code))

    return item[0] if item else {}

def get_rm_rate(item_code):
    from erpnext.stock.stock_ledger import get_valuation_rate
    warehouse = get_user_warehouse()
    rate = frappe.db.get_value("Item Price", {"price_list": frappe.db.get_single_value('Buying Settings', 'buying_price_list'),
        "item_code": item_code}, "price_list_rate")

    return rate


def validate_events(doc, method):
    enable_serial_no_for_tailoring(doc)
    set_valuation_rate(doc)

def set_valuation_rate(doc):
    hour_rate = flt(frappe.db.get_single_value('HR Settings', 'hour_rate')) or 0

    operations = 0
    if doc.operations:
        operations = [flt(d.time_in_mins/60) for d in doc.operations if d.time_in_mins]
        if len(operations) >0:
            operations = sum(operations)

    working_cost = hour_rate * flt(operations)

    rm_valuation = 0
    default_price_list = frappe.db.get_single_value('Buying Settings', 'buying_price_list')

    if not doc.fabric_rate:
        doc.fabric_rate = flt(frappe.db.get_value('Item Price', 
            {'item_code': doc.fabric_code, 'price_list': default_price_list}, 'price_list_rate'))

    for data in doc.items:
        if data.qty and default_price_list:
            rm_rate = flt(frappe.db.get_value('Item Price', 
                {'item_code': data.item_code, 'price_list': default_price_list}, 'price_list_rate')) or 0
            rm_valuation += (flt(data.qty) * rm_rate)
        else:
            frappe.throw(_("Set Default Buying Price List in Buying Settings"))

    for d in doc.size_details:
        d.valuation_rate = (flt(d.fabric_qty) * doc.fabric_rate) + rm_valuation + working_cost

    valuation_rate = [d.valuation_rate for d in doc.size_details if d.valuation_rate]

    if valuation_rate:
        valuation_amt = reduce(lambda x, y: x + y, valuation_rate) / flt(len(valuation_rate))
        doc.valuation_rate = valuation_amt

def update_op_events(doc, method):
    if not frappe.db.exists('Item Naming Series', 'ALT-'):
        frappe.get_doc({
            'doctype': 'Item Naming Series',
            'item_naming_series': 'ALT-'
        }).insert(ignore_permissions=True)

    if not frappe.db.get_value('Item', {'item_name': doc.name}, 'name'):
        frappe.get_doc({
            'doctype': 'Item',
            'item_naming_series': 'ALT-',
            'item_group': _('Services'),
            'is_sub_contracted_item': 1,
            'is_stock_item': 0,
            'stock_uom': 'Nos',
            'item_name': doc.name,
            'item_code': doc.name
        }).insert(ignore_permissions=True)


def update_po_events(doc, method):
    doc.supplied_items = []
    for d in doc.items:
        if d.production_order and d.subcontract_operation:
            item = frappe.db.get_value('Production Order', d.production_order, 'production_item')
            items = frappe.get_all('BOM Item', fields = ['*'],
                filters = {'parent': item, 'parenttype': 'Item', 'operation':d.subcontract_operation})

            if items:
                for d in items:
                    doc.append('supplied_items', {
                        'main_item_code': item,
                        'rm_item_code':d.item_code,
                        'required_qty': d.qty,
                        'stock_uom': d.stock_uom
                    })


def update_pr_events(doc, method):
    from tailorpad.custom_folder.custom_manufacturing import update_po_status
    doc.supplied_items = []
    operations = {}
    for d in doc.items:
        if d.production_order and d.subcontract_operation:
            operations.setdefault(d.production_order, d.subcontract_operation)
            po_doc = frappe.get_doc('Production Order', d.production_order)
            items = frappe.get_all('BOM Item', fields = ['*'],
                filters = {'parent': po_doc.production_item, 'parenttype': 'Item', 'operation':d.subcontract_operation})

            if items:
                for d in items:
                    doc.append('supplied_items', {
                        'main_item_code': po_doc.production_item,
                        'rm_item_code':d.item_code,
                        'required_qty': d.qty,
                        'stock_uom': d.stock_uom
                    })

    if doc.supplied_items:
        stock_entry = frappe.new_doc('Stock Entry')
        stock_entry.material_purpose = 'Material Issue'
        stock_entry.purpose = 'Material Issue'
        stock_entry.branch = get_user_branch()
        for d in doc.supplied_items:
            stock_entry.append('items', {
                'item_code': d.rm_item_code,
                'qty': d.required_qty,
                's_warehouse': get_user_warehouse(),
                'work_order': po_doc.work_order
            })

        stock_entry.set_missing_values()
        stock_entry.submit()

    if operations:
        for po, operation in operations.items():
            po_doc = frappe.get_doc('Production Order', po)
            for d in po_doc.operations:
                if d.operation == operation:
                    d.status = 'Completed'
                    d.db_update()

            update_po_status(po)
