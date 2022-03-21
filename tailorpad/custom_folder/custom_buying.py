from __future__ import unicode_literals
import frappe
from frappe.utils import cstr, cint, flt, nowdate
from frappe import _, throw

STANDARD_USERS = ("Guest", "Administrator")

def submit_event(doc, method):
    make_po_for_manufacturer(doc)
    make_po_for_fabric_supplier(doc)

def make_po_for_manufacturer(doc):
    for data in doc.items:
        if data.manufacturer_name and cint(data.make_po_for_manufacturer) == 1:
            chek_is_fabric(data.item_code)
            item_data = get_items_args(data)
            for args in item_data:
                name = frappe.db.get_value('Purchase Order', {'supplier': data.manufacturer_name, 'sales_order': doc.name}, 'name')
                make_po(name, doc, args, data)

def make_po(name, doc, args, data):
    if name:
        po_doc = frappe.get_doc('Purchase Order', name)
        add_po_item(po_doc, args)
    else:
        supplier = frappe.get_doc('Supplier', data.manufacturer_name)
        po_doc = frappe.get_doc({
            'doctype': 'Purchase Order',
            'supplier': supplier.name,
            'email_id': get_supplier_email_id(supplier.name),
            'currency': supplier.default_currency or doc.currency,
            'sales_order': doc.name,
            'customer_name': doc.customer_name or doc.customer,
            'company': doc.company,
            'buying_price_list': supplier.default_price_list or frappe.db.get_value('Buying Settings', None, 'buying_price_list')
        })
        add_po_item(po_doc, args)
        po_doc.run_method("set_missing_values")
    po_doc.save(ignore_permissions=True)

def make_po_for_fabric_supplier(doc):
    for data in doc.items:
        if data.fabric_supplier and data.fabric_item_code and cint(data.make_po_for_supplier) == 1:
            chek_is_fabric(data.fabric_item_code)
            name = frappe.db.get_value('Purchase Order', {'supplier': data.fabric_supplier, 'sales_order': doc.name}, 'name')
            args = {'item_code': data.fabric_item_code, 'qty': data.fabric_qty, 'warehouse': data.fabric_warehouse, 'item_name': data.fabric_item_name, 'uom': data.fabric_item_uom,
                    'schedule_date': nowdate(), 'conversion_factor': frappe.db.get_value("UOM Conversion Detail",{'parent': data.fabric_item_code
                    , 'uom': data.fabric_item_uom}, "conversion_factor")}
            if name:
                po_doc = frappe.get_doc('Purchase Order', name)
                add_po_item(po_doc, args)
            else:
                supplier = frappe.get_doc('Supplier', data.fabric_supplier)
                po_doc = frappe.get_doc({
                    'doctype': 'Purchase Order',
                    'supplier': supplier.name,
                    'email_id': get_supplier_email_id(supplier.name),
                    'currency': supplier.default_currency or doc.currency,
                    'sales_order': doc.name,
                    'customer_name': doc.customer_name or doc.customer,
                    'company': doc.company,
                    'buying_price_list': supplier.default_price_list or frappe.db.get_value('Buying Settings', None, 'buying_price_list')
                })
                add_po_item(po_doc, args)
                po_doc.run_method("set_missing_values")
            po_doc.save(ignore_permissions=True)

def get_items_args(data):
    args = frappe.db.get_values('Product Bundle Item',
                {'parent': data.item_code, 'parenttype': 'Product Bundle'}, ['item_code', 'qty', 'uom'], as_dict=1) or [{'item_code': data.item_code, 'qty': 1, 'uom': data.stock_uom}]

    for item in args:
        item.update({'qty': flt(item.get('qty')) * flt(data.qty), 'warehouse': data.warehouse, 'item_name': frappe.db.get_value('Item', item.get('item_code'), 'item_name'),
                    'schedule_date': nowdate(), 'conversion_factor': frappe.db.get_value("UOM Conversion Detail",{'parent': item.get('item_code')
                    , 'uom': item.get('uom')}, "conversion_factor")})
    return args

def chek_is_fabric(item_code):
    if cint(frappe.db.get_value('is_purchase_item')) != 1 and cint(frappe.db.get_value('is_stock_item')) == 1:
        frappe.throw(_('Item : {0} is not purchase item').format(item_code))

def add_po_item(doc, args):
    doc.append('items', args)

def cancel_event(doc, method):
    check_po_link(doc)

def before_cancel_event(doc, method):
    frappe.db.sql("""delete from `tabWork Order` where sales_order = %s and docstatus = 0""", doc.name)

def check_po_link(doc):
    for data in frappe.db.get_values('Purchase Order', {'sales_order': doc.name, 'docstatus': '<>2'}, 'name', as_dict=1):
        throw(_('Error: Sales Order {0}, is linked with Purchase Order {1}, delete Purchase Order first').format(doc.name, data.name))

@frappe.whitelist()
def get_supplier_email_id(supplier):
    email_id = frappe.db.sql(""" select c.email_id
        from `tabContact` c, `tabDynamic Link` dl
        where dl.parent = c.name and dl.link_name = %s 
        and dl.link_doctype = 'Supplier'""", supplier, as_list=1)

    return email_id[0][0] if email_id else None

@frappe.whitelist()
def send_email_to_supplier(supplier, email_id, po_no, so_no, message):
    sender = frappe.session.user not in STANDARD_USERS and frappe.session.user or None
    try:
        frappe.sendmail(recipients=email_id, sender=sender, subject="Purchase Order",message=message,
                            attachments = get_wo_prints(supplier, so_no, po_no))
        return True
    except Exception as e:
        frappe.errprint(e)
        frappe.throw("Email not sent, check email settings")

def get_wo_prints(supplier, so_no, po_no):
    print_format_list = [frappe.attach_print('Purchase Order', po_no)]
    if so_no:
        wo = frappe.db.sql(""" select name from `tabWork Order` where parent_item_code in (select distinct item_code from
        `tabSales Order Item` where parent = %(sales_order)s and manufacturer_name = %(supplier)s) and sales_order = %(sales_order)s
        and docstatus=1 """, {'sales_order': so_no, 'supplier': supplier}, as_dict=1)
        for data in wo:
            print_format_list.append(frappe.attach_print('Work Order', data.name, print_format='Work Order'))
    return print_format_list
