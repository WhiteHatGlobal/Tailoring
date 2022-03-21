from __future__ import unicode_literals
import frappe, json
from frappe.utils import cstr, cint, flt, getdate, get_datetime
from tailorpad.custom_folder.custom_stock import get_user_branch, get_user_warehouse
from frappe import _, throw, msgprint
from frappe.contacts.doctype.contact.contact import get_contact_details
from tailorpad.custom_folder.custom_manufacturing import (get_users_wo_operation, get_latest_operation,
	get_trial_serial_no, make_stock_entry)
import json
def submit_event(doc, method):
   # make_work_order(doc)
    ###custom code for making production plan from sales order submission
    make_fit_session(doc)
    make_production_order(doc)
    make_wo(doc)
    make_payment(doc)
    update_bom(doc)
    validate_size(doc)
    if doc.advance_payment_amount:
        make_payment_request(doc, doc.advance_payment_amount)
    make_bin_for_fabric(doc)
def customer_onload_events(doc, method):
    body = frappe.db.sql("""select name from `tabMeasurement Template` where measurement_template = 'Body Measurement'""")
    if body:
        doc.body = "Enabled"
    alteration =  frappe.db.sql("""select name from `tabMeasurement Template` where measurement_template = 'Alteration Measurement'""")
    if alteration:
        doc.alteration = "Enabled"
    garment = frappe.db.sql("""select name from `tabMeasurement Template` where measurement_template = 'Garment Measurement'""")
    if garment:
        doc.garment = "Enabled"
    if (doc.customer_name and doc.last_name):
        doc.full_name = doc.customer_name + ' ' + doc.last_name
  
    else:
        doc.full_name = doc.customer_name
def onload_events_so(doc, method):
    work_order = frappe.db.sql("""select sales_order,item_code,cost_to_customer,total_cost  from `tabWork Order` where sales_order=%s""",doc.name,as_dict=True)
    if work_order:
        for wo in work_order:
            for so in doc.get("items"):
                if wo.item_code == so.item_code:
                    so.cost = wo.cost_to_customer
                    so.style_cost = wo.total_cost
                    frappe.db.sql("""update `tabSales Order Item` set cost = %s where parent = %s""",(wo.cost_to_customer,doc.name),as_list=True)
                    frappe.db.sql("""update `tabSales Order Item` set style_cost=%s where parent = %s""",(wo.total_cost,doc.name),as_list=True)
                    frappe.db.commit()
    
    comp_qty = ''
    po = frappe.db.sql("""select serial_no,name from `tabProduction Order` where sales_order=%s""",doc.name,as_dict=True)
    for x in po:
        for so in doc.get("items"):
            qty = frappe.db.sql("""select completed_qty from `tabJob Card Table` where parent=%s and work_order=%s""",(x.name,so.work_order),as_dict=True)
            if qty:
                for c_qty in qty:
                    comp_qty = c_qty.completed_qty
            so.serial_no = x.serial_no
            frappe.db.sql("""update `tabSales Order Item` set serial = %s where parent = %s""",(x.serial_no,doc.name))
            if comp_qty:
                so.comp_qty = comp_qty
                frappe.db.sql("""update `tabSales Order Item` set comp_qty = %s where parent = %s""",(so.po_qty,doc.name))
            frappe.db.commit()
def validate_events_so(doc, method):
    raw = []
    for d in doc.get('items'):
        if d.allowed_raw_materials:
                allow_raw = d.allowed_raw_materials
                allow_raw = allow_raw.split('\n')
                raw.append(allow_raw)
        if not d.fabric_qty and d.item_code and d.fabric_item_code:
            if d.size and d.width and d.fabric_pattern:
                d.fabric_qty = get_fabric_qty(d.item_code, d.size, d.width, d.fabric_pattern)
    amount = doc.rounded_total or doc.grand_total
    doc.outstanding_value = amount - (doc.advance_payment_amount or 0)
    for x in doc.get('items'):
        if doc.packed_items:
            for y in doc.get('packed_items'):
                if x.item_code == y.parent_item:
                    y.fabric_item_code = x.fabric_item_code
                    y.fabric_item_name = x.fabric_item_name
                    y.fabric_item_uom = x.fabric_item_uom
                    y.fabric_qty = x.fabric_qty

                if y.work_order_no:
                    wo = frappe.get_doc("Work Order",y.work_order_no)
                    if y.item_code == wo.item_code:
                        wo.item_qty = y.qty
                    for item in wo.get("items"):
                        if x.fabric_item_code:
                            so = frappe.db.sql("""select fabric_item_code from `tabSales Order Item` where parent = %s""",doc.name,as_dict=True)
                            work_order = frappe.db.sql("""select item_code from `tabBOM Item` where parent = %s""",x.work_order,as_dict=True)
                            for so_item in so:
                                if so_item.fabric_item_code == item.item_code:
                                    item.item_code = x.fabric_item_code
                                    item.qty = x.fabric_qty
                    wo.save()

        if x.work_order and not doc.packed_items:
                    wo = frappe.get_doc("Work Order",x.work_order)
                    if x.item_code == wo.item_code:
                        wo.item_qty = x.qty
                    fabric = []
                    for item in wo.get("items"):
                        if x.fabric_item_code:
                            so = frappe.db.sql("""select fabric_item_code from `tabSales Order Item` where parent = %s""",doc.name,as_dict=True)
                            work_order = frappe.db.sql("""select item_code from `tabBOM Item` where parent = %s""",x.work_order,as_dict=True)
                            for so_item in so:
                                if so_item.fabric_item_code == item.item_code:
                                        item.item_code = x.fabric_item_code
                                        item.qty = x.fabric_qty
                                else: 
                                    pass       
                                   # frappe.msgprint("else")
                                    #wo.append('items', {
                                    #'item_code': x.fabric_item_code,
                                    #'item_name': x.fabric_item_name or frappe.db.get_value('Item', x.fabric_item_code, 'item_name'),
                                    #'supplier': frappe.db.get_value('Item', x.fabric_item_code, 'default_supplier'),
                                    #'warehouse': x.get("fabric_warehouse") or frappe.db.get_value('Item', x.fabric_item_code, 'default_warehouse'),
                                    #'description': x.description,
                                    #'operation': frappe.db.get_value('BOM Operation', 
                                    #{'parent': x.fabric_item_code, 'parenttype': 'Item', 'idx':1}, 'operation'),
                                    #'stock_uom': x.fabric_item_uom or frappe.db.get_value('Item', x.fabric_item_code, 'stock_uom'),
                                    #'qty': x.fabric_qty,
                                    #'stock_qty': x.fabric_qty,
                                    #'uom': x.fabric_item_uom or frappe.db.get_value('Item', x.fabric_item_code, 'stock_uom')
                                    #})


                    wo.save()

    #make_work_order(doc)

def make_payment(doc):
    if doc.advance_payment_amount:
        payment = frappe.new_doc("Payment Entry")
        payment.naming_series = "ACC-PAY-.YYYY.-"
        payment.party = doc.customer
        payment.priority = "Regular"
        payment.paid_amount = doc.advance_payment_amount
        payment.payment_type = "Receive"
        payment.party_type = "Customer"
        payment.mode_of_payment = doc.type_of_payment
        if payment.mode_of_payment == "Cash":
            payment.paid_to = frappe.get_cached_value('Company', doc.company,  'default_cash_account')
        else:
            payment.paid_to = frappe.get_cached_value('Company', doc.company,  'default_bank_account')
        payment.reference_no = doc.reference_no
        payment.reference_date = doc.reference_date
        payment.paid_to_account_currency = frappe.get_cached_value('Global Defaults', 'None',  'default_currency')
        payment.received_amount = doc.advance_payment_amount
        child_table = payment.append('references', {})
        child_table.reference_doctype = "Sales Order"
        child_table.reference_name = doc.name
        payment.sales_order = doc.name
        payment.insert(ignore_permissions = True)
        doc.payment_entry = payment.name
        payment.submit()
        frappe.msgprint(("Payment Entry submitted for {0}.").format(payment.name), alert=1)

def make_wo(doc):
    selling = frappe.db.get_single_value("Selling Settings", "create_work_order_after_submitting_sales_order")
    if selling == 1:
        if not doc.packed_items:
            for args in doc.items:
                manf_item = frappe.db.get_value("Item",args.item_code,"include_item_in_manufacturing")
                if manf_item == 1 and args.work_order_creation == 0:
                    if args.item_group in ['Bespoke', 'Alteration'] or args.order_type in ['New Order', 'Alteration', 'RTW/Alteration']:            
                        prepare_data_for_wo(doc, args)
                        args.work_order_creation = "1"
        else:
            for args in doc.packed_items:
                if args.work_order == 0:
                        prepare_data_for_wo(doc, args)
                        args.work_order = "1"
        for x in doc.items:
                x.work_order_creation = "1"

@frappe.whitelist()
def make_work_order(doc):
    doc = frappe.get_doc("Sales Order",doc)
    selling = frappe.db.get_single_value("Selling Settings", "create_work_order_after_submitting_sales_order")

    if not doc.packed_items and selling == 0:
        for args in doc.items:
            manf_item = frappe.db.get_value("Item",args.item_code,"include_item_in_manufacturing")
            if manf_item == 1 and not args.work_order:
                if args.item_group in ['Bespoke', 'Alteration'] or args.order_type in ['New Order', 'Alteration', 'RTW/Alteration']:            
                        prepare_data_for_wo(doc, args)
    else:
        for args in doc.packed_items:
            if args.work_order == 0:
                        prepare_data_for_wo(doc, args)
                        args.work_order = "1"
        for x in doc.items:
            x.work_order_creation = "1"
   # doc.save()
def update_bom(doc):
    items = []
    l1 = []
    for item in doc.items:
        if item.bom_no:
            bom = frappe.get_doc("BOM",item.bom_no)
            if bom.docstatus == 0 and item.allowed_raw_materials:
                allow_raw = item.allowed_raw_materials
                allow_raw = allow_raw.split('\n')
                main_item = frappe.get_all('Item', fields=["name"], 
                filters={'name': ('in', allow_raw)}, as_list=True)
                for x in main_item:
                    items.append(x)
                for res in items:
                    l1.append(res[0])
                for it in l1:
                    item_table = bom.append('items')
                    item_table.item_code = it
                    item_table.item_name = frappe.db.get_value('Item', it, 'item_name')
                    item_table.description = frappe.db.get_value('Item', it, 'description')
                    item_table.qty = item.qty
                    item_table.uom = item.uom
                    item_table.stock_uom = item.stock_uom
                    item_table.stock_qty = item.stock_qty
            if bom.docstatus == 0 and item.fabric_item_code:
                    item_table = bom.append('items')
                    item_table.item_code = item.fabric_item_code
                    item_table.item_name = frappe.db.get_value('Item', item.fabric_item_code, 'item_name')
                    item_table.description = frappe.db.get_value('Item', item.fabric_item_code, 'description')
                    item_table.qty = item.qty
                    item_table.uom = item.uom
                    item_table.stock_uom = item.stock_uom
                    item_table.stock_qty = item.stock_qty
            bom.save()

def appointment(doc):
    
    if doc.trial_date:
        apt = frappe.new_doc("Appointment")
        apt.scheduled_time = doc.trial_date
        apt.delivery_time = doc.delivery
        apt.customer_name = doc.customer
        apt.customer_email = frappe.db.get_value('Customer', doc.customer, 'email')
        apt.save(ignore_permissions=True)
        apt.flags.ignore_mandatory = True

def fit_session(doc):
    if doc.trial_date:  
        for item in doc.items:
            it = frappe.get_doc("Item",item.item_code)
            trials = frappe.db.get_value('BOM Operation',
                {'parenttype': 'Item', 'parent': item.item_code, 'trials': 1}, 'name')
            if trials:
                trial = frappe.get_doc({
                    'doctype': 'Fit Session',
                    'sales_order': doc.name,
                    'customer': doc.customer,
                    'current_trial_no':1,
                    'current_trial_date': doc.fitting_date,
                    'trial_date': doc.trial_date,
                    'order_date': doc.transaction_date,
                    'delivery_date': doc.delivery,
                    'customer_name': doc.customer_name,
                    #'trial_serial_no': get_trial_serial_no(doc.serial_no),
                    'item_code': item.item_code,
                    'item_name': item.item_name,
                    'production_order': doc.production_orders,
                    'work_order': item.work_order,
				#'work_order': self.name,
                    'warehouse': frappe.db.get_value('BOM Operation',
                    {'parenttype': 'Item', 'parent': item.item_code, 'trials': 1}, 'warehouse')
                }).insert(ignore_permissions=True)
                for data in it.operations:
                    if data.trials:
                #if data.trials and data.branch_dict:
                    #branch_data = json.loads(data.branch_dict)
                    #for i in sorted(branch_data):
                     #   d = branch_data[i]
                      #  if d:
                            trial.append('trials', {
                                'operation': data.operation,
                                'trial_no': trial.idx,
                                'trial_status': 'Pending',
                                'start_time': doc.trial_date,
                            #'target_warehouse': get_user_warehouse(data.branch)
                        })
                trial.save(ignore_permissions=True)

def purchase_order(doc):
    item = []
    so_item = []
    l1 = []
    l2 = []
    for i in doc.items:
        raw_item = frappe.db.sql("""select item_sub_group from `tabRaw Material` where parent = %s""",i.item_code,as_dict=True)
        if raw_item:
            for x in raw_item:
                l1.append(x.item_sub_group)
        if i.allowed_raw_materials:
            allow_raw = i.allowed_raw_materials
            allow_raw = allow_raw.split('\n')
            x = frappe.get_all('Item', fields=["item_sub_group"], 
            filters={'name': ('in', allow_raw)}, as_list=True)
            for i in x:
                so_item.append(i)
            for r in so_item:
                l2.append(r[0])
    if l1 and l2:
        for it in doc.items:
            for elem in l1:
                if not elem in l2:
                    frappe.throw("Warning: Raw Material Item Sub Group " + str(elem) + " not yet selected for " + str(it.item_code))


    supp = []
    raw_supp = []
    fab_supp = []
    sup_lbl = frappe.get_all("Sales Order Item",filters={"parent": doc.name},fields=("supplier","raw_supplier","fabric_supplier","item_code","raw_material_code","fabric_item_code"))
    for i in sup_lbl:
        if not i.supplier and not i.raw_supplier and not i.fabric_supplier and i.item_code and i.raw_material_code and i.fabric_item_code: 
            supp.append([i.item_code,i.raw_material_code,i.fabric_item_code])
        
        elif not i.supplier and not i.raw_supplier and i.item_code and i.raw_material_code and not i.fabric_item_code:
            supp.append([i.item_code,i.raw_material_code])

        elif not i.supplier and not i.fabric_supplier and i.item_code and i.fabric_item_code and not i.raw_material_code: 
            supp.append([i.item_code,i.fabric_item_code])

        elif not i.supplier and i.item_code and not i.raw_material_code and not i.fabric_item_code:
            supp.append(i.item_code)

        elif i.supplier and not i.raw_supplier and i.item_code and i.raw_material_code and not i.fabric_item_code:
            supp.append(i.raw_material_code)

        elif i.supplier and i.raw_supplier and not i.fabric_supplier and i.item_code and i.raw_material_code and i.fabric_item_code:
            supp.append(i.fabric_item_code)


    len_supp = len(supp)

    if len_supp > 0:
        for j in supp:
            frappe.throw('Following items ' + str(j) + ' does not have Default Supplier. You can enter supplier from its item master')
##On submit sales order to create purchase order depends on supplier with fabric item 
    so_item = frappe.db.sql("""select distinct supplier from `tabSales Order Item` where parent = %s and fabric_item_code is null""",doc.name,as_dict=True)
    for i in so_item:
        it = frappe.db.sql("""select item_code,fabric_item_code,qty,delivery_date,item_name,description,uom,stock_uom,supplier,fabric_supplier from `tabSales Order Item` where parent = %s and supplier = %s""",(doc.name,i.supplier),as_dict=True)
        purchase_order = frappe.new_doc("Purchase Order")
        for x in it:
                purchase_order.supplier = x.supplier

                it_table = purchase_order.append('items', {})
                it_table.item_code = x.item_code
                it_table.qty = x.qty
                it_table.schedule_date = x.delivery_date
                it_table.item_name = x.item_name
                it_table.description = x.description
                it_table.uom = x.uom
                it_table.stock_uom = x.stock_uom
                it_table.warehouse = frappe.db.get_single_value("Stock Settings", "default_warehouse")
                if x.fabric_item_code and x.supplier == x.fabric_supplier:
                    it_table = purchase_order.append('items')
                    it_table.item_code = x.fabric_item_code
                    it_table.qty = x.qty
                    it_table.schedule_date = x.delivery_date
                    it_table.item_name = frappe.db.get_value('Item',x.fabric_item_code, 'item_name')
                    it_table.description = frappe.db.get_value('Item',x.fabric_item_code, 'description')
                    it_table.uom = x.uom
                    it_table.stock_uom = x.stock_uom
                    it_table.warehouse = frappe.db.get_single_value("Stock Settings", "default_warehouse")

                if x.fabric_item_code and x.supplier != x.fabric_supplier:
                        fabric_order = frappe.new_doc("Purchase Order")
                        fabric_order.supplier = x.fabric_supplier
                        it_table = fabric_order.append('items')
                        it_table.item_code = x.fabric_item_code
                        it_table.qty = x.qty
                        it_table.schedule_date = x.delivery_date
                        it_table.item_name = frappe.db.get_value('Item',x.fabric_item_code, 'item_name')
                        it_table.description = frappe.db.get_value('Item',x.fabric_item_code, 'description')
                        it_table.uom = x.uom
                        it_table.stock_uom = x.stock_uom
                        it_table.warehouse = frappe.db.get_single_value("Stock Settings", "default_warehouse")

                        fabric_order.save()

        purchase_order.save()

    
def prepare_data_for_wo(doc, args, allow_return=False):
    quantities = args.split_qty.split(',') if args.split_qty else [args.qty]
    item_data = frappe.db.get_values('Product Bundle Item',
                {'parent': args.item_code, 'parenttype': 'Product Bundle'}, ['item_code', 'parent', 'qty'], as_dict=1) or [{'parent': args.item_code,
                'item_code': args.item_code, 'qty':1}]
    frappe.msgprint(str(item_data))
    for items in item_data:
        for qty in quantities:
            frappe.msgprint("inside for")
            qty = flt(qty) * flt(items.get('qty'))
            wo = create_work_order(doc, args, items, qty)
            frappe.msgprint(str(wo))
  #  if allow_return:
    #wo = create_work_order(doc, args, items, qty)

    return wo

def create_work_order(doc, args, items, qty):
    wo = frappe.get_doc({
        'doctype': 'Work Order',
        'sales_order': doc.name,
        'status':'Draft',
        'parent_item_code': items.get('parent'),
        'order_type': args.get('order_type'),
        'item_code': items.get('item_code'),
        'bom_no': args.bom_no,
        'item_name': frappe.db.get_value('Item', items.get('item_code'), 'item_name'),
        'item_group': frappe.db.get_value('Item', items.get('item_code'), 'item_group'),
        'item_qty': qty,
        'size': args.size,
        'company': doc.company,
        'delivery_date': get_datetime(args.get('delivery_date')) if args.get('delivery_date') else None,
        'trial_date': get_datetime(args.get('trial_date')) if args.get('trial_date') else None,
        'booking_date': getdate(doc.transaction_date),
        'fabric_code': args.fabric_item_code,
        'fabric_qty': args.fabric_qty,
        'fabric_name' : frappe.db.get_value('Item', args.fabric_item_code, 'item_name'),
        'customer': doc.customer,
        'customer_name': doc.customer_name,
        'priority': doc.priority,
        'delivery_warehouse': args.get('warehouse') or get_user_warehouse(),
        'fg_warehouse': args.get('warehouse') or get_user_warehouse(),
        'source_warehouse': frappe.db.get_single_value("Stock Settings", "default_warehouse"),
        'wip_warehouse': frappe.db.get_single_value('Manufacturing Settings', 'default_wip_warehouse'),
        'sales_order_idx': args.idx,
        'attach_image': frappe.db.get_value('Item', items.get('item_code'), 'image'),
        'fabric_supplier': frappe.db.get_value('Item', args.fabric_item_code, 'default_supplier'),
        'tailoring_supplier': frappe.db.get_value('Item', items.get('item_code'), 'default_supplier'),
        'cost_to_customer': items.get('cost'),
    })

    item_doc = frappe.get_doc('Item', items.get('item_code'))
    wo.note = item_doc.description
    it = items.get('item_code')
    add_body_measurement_fields(doc.customer, wo, item_doc, it)
    add_garment_measurement_fields(doc.customer , wo, item_doc, it)
   # get_measurement_fields(doc.customer, wo, item_doc)
    add_alteration_measurement_fields(doc.customer, wo, item_doc, it)
    add_style_fields(doc.customer, wo, item_doc, it)
    add_product_fields(doc.customer, wo, item_doc, it)
  #  get_style_fields(wo, item_doc, doc.customer)

    if frappe.db.get_single_value('Manufacturing Settings', 'auto_production_order'):
        wo.branch = get_user_branch()
        set_operations(wo, item_doc, args)
        set_items(wo, item_doc, args)
        set_fabric_item(wo, args)

    if args.raw_materials:
        raw_materials_data = (json.loads(args.raw_materials) if args.raw_materials
            else item_doc.items)
        for d in raw_materials_data:
            if isinstance(d, dict):
                d = frappe._dict(d)

            rm_item_data = frappe.db.get_value('Item',
                d.item_code, ['default_supplier', 'description', 'default_warehouse', 'item_name', 'stock_uom'], as_dict=1)
            wo.append('items', {
                'item_code': d.item,
                'item_name': frappe.db.get_value('Item', d.item_code, 'item_name'),
                'supplier': d.supplier or frappe.db.get_value('Item', d.item_code, 'default_supplier'),
                'warehouse': d.warehouse or frappe.db.get_value('Item', d.item_code, 'default_warehouse'),
                'description': frappe.db.get_value('Item', d.item_code, 'description'),
                'stock_uom': frappe.db.get_value('Item', d.item_code, 'stock_uom'),
                'qty': (d.get("quantity")),
                'stock_qty': d.get("quantity") or d.get("qty"),
                'uom': frappe.db.get_value('Item', d.item_code, 'stock_uom')
                #'make_po': d.make_po,
                #'operation': d.get("operation")
            })

    if args.raw_item:
        raw_materials_data = (json.loads(args.raw_item) if args.raw_item
            else item_doc.items)
        for d in raw_materials_data:
            if isinstance(d, dict):
                d = frappe._dict(d)

            rm_item_data = frappe.db.get_value('Item',
                d.item_code, ['default_supplier', 'description', 'default_warehouse', 'item_name', 'stock_uom'], as_dict=1)
            wo.append('items', {
                'item_code': d.item,
                'item_name': frappe.db.get_value('Item', d.item_code, 'item_name'),
                'supplier': d.supplier or frappe.db.get_value('Item', d.item_code, 'default_supplier'),
                'warehouse': d.warehouse or frappe.db.get_value('Item', d.item_code, 'default_warehouse'),
                'description': frappe.db.get_value('Item', d.item_code, 'description'),
                'stock_uom': frappe.db.get_value('Item', d.item_code, 'stock_uom'),
                'qty': (d.get("quantity")),
                'stock_qty': d.get("quantity") or d.get("qty"),
                'uom': frappe.db.get_value('Item', d.item_code, 'stock_uom')
                #'make_po': d.make_po,
                #'operation': d.get("operation")
            })

    
    if args.order_type and args.order_type in ['RTW/Alteration', 'RTW']:
        wo.serial_no = args.serial_no

    customer_photo = frappe.db.get_value('Customer', 
        doc.customer, ['attach_front_side', 'attach_back_side', 'side_view'], as_dict=1)

    if customer_photo:
        wo.update(customer_photo)
    wo.save()
    for i in doc.get('items'):
        if wo.item_code == i.item_code:
            i.work_order = wo.name
            i.save()
     #   frappe.db.sql("""update `tabSales Order Item` set work_order = %s where parent = %s and item_code = %s""",(wo.name,doc.name,wo.item_code))
        #i.work_order = wo.name
    if doc.packed_items:
        for x in doc.get('packed_items'):
            if wo.item_code == x.item_code:
                frappe.db.sql("""update `tabPacked Item` set work_order_no = %s where parent = %s""",(wo.name,doc.name))
                x.work_order_no = wo.name
    return wo.name

def make_fit_session(doc):
    if doc.trial_date:
        fit_session(doc)
        value = frappe.db.get_single_value("Selling Settings", "sent_automatic_appointment")
        if value == 1:
            appointment(doc)
    buying_value = frappe.db.get_single_value("Buying Settings", "create_purchase_order")
    if buying_value:
        purchase_order(doc)

###Custom code for creating production order from sales order submission
def make_production_order(doc):
    pass
#    for i in doc.items:
#        manf_item = frappe.db.get_value("Item",i.item_code,"include_item_in_manufacturing")
#        if manf_item == 1:
#            po = frappe.get_doc({
#                'doctype': 'Production Order',
#            })

#            po.append('production_order_table',{
#                "production_item": i.item_code,
#                "bom_no": i.bom_no,
#                "qty": i.qty,
#                "sales_order" : doc.name
#            })

#            po.save(ignore_permissions = True)
#            ignore_permissions = False
            #doc.production_orders = po.name
#            frappe.db.sql("""update `tabSales Order` set production_orders = %s where name = %s""",(po.name,doc.name))
#            frappe.db.sql("""update `tabWork Order` set production_order = %s where sales_order = %s""",(doc.production_orders,doc.name))
       
def add_body_measurement_fields(customer, wo, item_doc, it):
        customer = frappe.get_doc("Customer",customer)
        body_measurement_field = [d.measurement_field for d in item_doc.body_measurement]
        work_order = frappe.db.sql("""select name from `tabWork Order` where item_code = %s and customer = %s""",(it,customer.name),as_dict=1)
        if work_order:
            l = len(work_order) - 1
            previous_wo = work_order[l]
            pre_wo = frappe.get_doc("Work Order",previous_wo)
            if previous_wo and pre_wo.body_measurement_fields and work_order:
                    for d in pre_wo.body_measurement_fields:
                        wo.append("body_measurement_fields",{
                            "measurement_field": d.measurement_field,
                            "measurement_value": d.measurement_value or 0,
                            "note": d.note,            
                            "image": d.image,
                            "image_html": d.image_html
                        })
            elif customer.measurement_fields:
                    for d in customer.measurement_fields:
                        wo.append("body_measurement_fields",{
                            "measurement_field": d.measurement_field,
                            "measurement_value": d.measurement_value or 0,
                            "note": d.note,            
                            "image": d.image,
                            "image_html": d.image_html
                        })
            else:
                item = frappe.get_doc("Item",it)
                if item.body_measurement_template and item.body_measurement:
                    for d in item.body_measurement:
                        wo.append("body_measurement_fields",{
                            "measurement_field": d.measurement_field,
                            "measurement_value": d.measurement_value or 0,
                            "note": d.note,            
                            "image": d.image,
                            "image_html": d.image_html
                        })

        elif customer.measurement_fields:
                    for d in customer.measurement_fields:
                        wo.append("body_measurement_fields",{
                            "measurement_field": d.measurement_field,
                            "measurement_value": d.measurement_value or 0,
                            "note": d.note,            
                            "image": d.image,
                            "image_html": d.image_html
                        })
        else:
                item = frappe.get_doc("Item",it)
                if item.body_measurement_template and item.body_measurement:
                    for d in item.body_measurement:
                        wo.append("body_measurement_fields",{
                            "measurement_field": d.measurement_field,
                            "measurement_value": d.measurement_value or 0,
                            "note": d.note,            
                            "image": d.image,
                            "image_html": d.image_html
                        })
def add_garment_measurement_fields(customer, wo, item_doc, it):
        customer = frappe.get_doc("Customer",customer)
        work_order = frappe.db.sql("""select name from `tabWork Order` where item_code = %s and customer = %s""",(it,customer.name),as_dict=1)
        if work_order:
            l = len(work_order) - 1
            previous_wo = work_order[l]
            if previous_wo:
                pre_wo = frappe.get_doc("Work Order",previous_wo)
            if pre_wo and pre_wo.measurement_fields:
                    for d in pre_wo.measurement_fields:
                        wo.append("measurement_fields",{
                            "measurement_field": d.measurement_field,
                            "measurement_value": d.measurement_value or 0,
                            "note": d.note,            
                            "image": d.image,
                            "image_html": d.image_html
                        })
            elif customer.garment_measurement_fields:
                    for d in customer.garment_measurement_fields:
                        wo.append("measurement_fields",{
                            "measurement_field": d.measurement_field,
                            "measurement_value": d.measurement_value or 0,
                            "note": d.note,            
                            "image": d.image,
                            "image_html": d.image_html
                        })
            else:
                item = frappe.get_doc("Item",it)
                if item.measurement_template and item.measurement_fields:
                    for d in item.measurement_fields:
                        wo.append("measurement_fields",{
                            "measurement_field": d.measurement_field,
                            "measurement_value": d.measurement_value or 0,
                            "note": d.note,            
                            "image": d.image,
                            "image_html": d.image_html
                        })

        elif customer.garment_measurement_fields:
                    for d in customer.garment_measurement_fields:
                        wo.append("measurement_fields",{
                            "measurement_field": d.measurement_field,
                            "measurement_value": d.measurement_value or 0,
                            "note": d.note,            
                            "image": d.image,
                            "image_html": d.image_html
                        })
        else:
                item = frappe.get_doc("Item",it)
                if item.measurement_template and item.measurement_fields:
                    for d in item.measurement_fields:
                        wo.append("measurement_fields",{
                            "measurement_field": d.measurement_field,
                            "measurement_value": d.measurement_value or 0,
                            "note": d.note,            
                            "image": d.image,
                            "image_html": d.image_html
                        })

def add_alteration_measurement_fields(customer, wo, item_doc, it):
        customer = frappe.get_doc("Customer",customer)
        work_order = frappe.db.sql("""select name from `tabWork Order` where item_code = %s and customer = %s""",(it,customer.name),as_dict=1)
        if work_order:
            l = len(work_order) - 1
            previous_wo = work_order[l]
            pre_wo = frappe.get_doc("Work Order",previous_wo)
            if previous_wo and pre_wo.alteration_measurement_fields and work_order:
                    for d in pre_wo.alteration_measurement_fields:
                        wo.append("alteration_measurement_fields",{
                            "measurement_field": d.measurement_field,
                            "measurement_value": d.measurement_value or 0,
                            "note": d.note,            
                            "image": d.image,
                            "image_html": d.image_html
                        })
            elif customer.alteration_measurement_fields:
                    for d in customer.alteration_measurement_fields:
                        wo.append("alteration_measurement_fields",{
                            "measurement_field": d.measurement_field,
                            "measurement_value": d.measurement_value or 0,
                            "note": d.note,            
                            "image": d.image,
                            "image_html": d.image_html
                        })
            else:
                item = frappe.get_doc("Item",it)
                if item.alteration_template and item.alteration_fields:
                    for d in item.alteration_fields:
                        wo.append("alteration_measurement_fields",{
                            "measurement_field": d.measurement_field,
                            "measurement_value": d.measurement_value or 0,
                            "note": d.note,            
                            "image": d.image,
                            "image_html": d.image_html
                        })

        elif customer.alteration_measurement_fields:
                    for d in customer.alteration_measurement_fields:
                        wo.append("alteration_measurement_fields",{
                            "measurement_field": d.measurement_field,
                            "measurement_value": d.measurement_value or 0,
                            "note": d.note,            
                            "image": d.image,
                            "image_html": d.image_html
                        })
        else:
                item = frappe.get_doc("Item",it)
                if item.alteration_template and item.alteration_fields:
                    for d in item.alteration_fields:
                        wo.append("alteration_measurement_fields",{
                            "measurement_field": d.measurement_field,
                            "measurement_value": d.measurement_value or 0,
                            "note": d.note,            
                            "image": d.image,
                            "image_html": d.image_html
                        })

def add_style_fields(customer, wo, item_doc, it):
        customer = frappe.get_doc("Customer",customer)
        work_order = frappe.db.sql("""select name from `tabWork Order` where item_code = %s and customer = %s""",(it,customer.name),as_dict=1)
        if work_order:
            l = len(work_order) - 1
            previous_wo = work_order[l]
            if previous_wo:
                pre_wo = frappe.get_doc("Work Order",previous_wo)
                wo.style_template = pre_wo.style_template
                if pre_wo.style_fields and work_order:
                    for d in pre_wo.style_fields:
                            wo.append("style_fields",
                                {"style_field": d.style_field,
                                "idx": d.idx,
                                "style_name": d.style_name,
                                "note": d.note,
                                "image": d.image,
                                "cost_to_customer": d.cost_to_customer,
                                "html_image": d.html_image})
                elif customer.styles:
                    wo.style_template = customer.style_template
                    for d in customer.styles:
                        wo.append("style_fields",
                                {"style_field": d.style_field,
                                "idx": d.idx,
                                "style_name": d.style_name,
                                "note": d.note,
                                "image": d.image,
                                "cost_to_customer": d.cost_to_customer,
                                "html_image": d.html_image})
                else:
                    item = frappe.get_doc("Item",it)
                    wo.style_template = item.name
                    if item.style_template and item.style_fields:
                        for d in item.style_fields:
                            if d.default:
                                wo.append("style_fields",
                                    {"style_field": d.style_field,
                                    "idx": d.idx,
                                    "style_name": d.style_name,
                                    "note": d.note,
                                    "image": d.image,
                                    "cost_to_customer": d.cost_to_customer,
                                    "html_image": d.html_image})
        elif customer.styles:
                    wo.style_template = customer.style_template
                    for d in customer.styles:
                        wo.append("style_fields",
                                {"style_field": d.style_field,
                                "idx": d.idx,
                                "style_name": d.style_name,
                                "note": d.note,
                                "image": d.image,
                                "cost_to_customer": d.cost_to_customer,
                                "html_image": d.html_image})
        else:
                item = frappe.get_doc("Item",it)
                wo.style_template = item.name
                if item.style_template and item.style_fields:
                    for d in item.style_fields:
                        if d.default:
                            wo.append("style_fields",
                                {"style_field": d.style_field,
                                "idx": d.idx,
                                "style_name": d.style_name,
                                "note": d.note,
                                "image": d.image,
                                "cost_to_customer": d.cost_to_customer,
                                "html_image": d.html_image})

def add_product_fields(customer, wo, item_doc, it):
        customer = frappe.get_doc("Customer",customer)
        work_order = frappe.db.sql("""select name from `tabWork Order` where item_code = %s and customer = %s""",(it,customer.name),as_dict=1)
        if work_order:
            l = len(work_order) - 1
            previous_wo = work_order[l]
            if previous_wo:
                pre_wo = frappe.get_doc("Work Order",previous_wo)
                wo.product_option = pre_wo.product_option
                if pre_wo.product_fields and work_order:
                    for d in pre_wo.product_fields:
                            wo.append("product_fields",
                                {"product_field": d.product_field,
                                "idx": d.idx,
                                "product_name": d.product_name,
                                "cost_to_customer": d.cost_to_customer,
                                "note": d.note,
                                "image": d.image,
                                "html_image": d.html_image})
                elif customer.products:
                    wo.product_option = customer.available_product_option
                    for d in customer.products:
                        wo.append("product_fields",
                                {"product_field": d.product_field,
                                "idx": d.idx,
                                "product_name": d.product_name,
                                "cost_to_customer": d.cost_to_customer,
                                "note": d.note,
                                "image": d.image,
                                "html_image": d.html_image})
                else:
                    item = frappe.get_doc("Item",it)
                    wo.product_option = item.name
                    if item.product_option and item.product_fields:
                        for d in item.product_fields:
                            if d.default:
                                wo.append("products_fields",
                                    {"product_field": d.product_field,
                                    "idx": d.idx,
                                    "product_name": d.product_name,
                                    "cost_to_customer": d.cost_to_customer,
                                    "note": d.note,
                                    "image": d.image,
                                    "html_image": d.html_image})
        elif customer.products:
                    wo.product_option = customer.available_product_option
                    for d in customer.products:
                        wo.append("product_fields",
                                {"product_field": d.product_field,
                                "idx": d.idx,
                                "product_name": d.product_name,
                                "cost_to_customer": d.cost_to_customer,
                                "note": d.note,
                                "image": d.image,
                                "html_image": d.html_image})
        else:
                item = frappe.get_doc("Item",it)
                wo.product_option = item.name
                if item.product_option and item.product_fields:
                    for d in item.product_fields:
                        if d.default:
                            wo.append("product_fields",
                                {"product_field": d.product_field,
                                "idx": d.idx,
                                "product_name": d.product_name,
                                "cost_to_customer": d.cost_to_customer,
                                "note": d.note,
                                "image": d.image,
                                "html_image": d.html_image})

def get_measurement_fields(customer, wo, item_doc):
    name = frappe.db.get_value("Customer Measurement", 
            {'customer': customer, 'measurement_template': item_doc.measurement_template}, "name")
    doc = ''
    cu_data = {}
    if name:
        doc = frappe.get_doc("Customer Measurement", name)

    for d in item_doc.measurement_fields:

        if doc:
            for data in doc.measurements:
                if data.measurement_field == d.measurement_field:
                    cu_data = data
        else:
           # cu_data = frappe.db.get_value('Customer Measurement Data', {'parent': customer, 'measurement_field': d.measurement_field,
            #    'measurement_template': item_doc.measurement_template}, ['measurement_value', 'note', 'image', 'image_html', 'idx'], as_dict=1) or {}
            cu_data = frappe.db.get_value('Measurement Fields', {'parent': item_doc, 'measurement_field': d.measurement_field,
                'measurement_template': item_doc.measurement_template}, ['measurement_value', 'note', 'image', 'image_html', 'idx'], as_dict=1) or {}

        wo.append("measurement_fields",
            {"measurement_field": d.measurement_field,
             "measurement_value": cu_data.get("measurement_value") or d.measurement_value or 0,
             "note": cu_data.get("note") or d.note,
             "idx": cu_data.get("idx") or d.idx,
             "image": cu_data.get("image") or d.image,
             "image_html": cu_data.get("image_html") or d.image_html})
def get_style_fields(wo, item_doc, customer):
    work_order = frappe.db.get_value("Work Order", 
        {'customer': customer, 'item_code': item_doc.name, 'docstatus':1}, 'name', order_by='creation desc')
    if work_order:
        work_order_doc = frappe.get_doc('Work Order', work_order)
        wo.note = work_order_doc.note
        for d in work_order_doc.style_fields:
            style_field_dict = {}
            for field in ['style_field', 'idx', 'style_name', 'note', 'image', 'html_image']:
                style_field_dict[field] = d.get(field)

            if style_field_dict:
                wo.append('style_fields', style_field_dict)

        return

    name = frappe.db.get_value("Customer Style", 
            {'customer': customer, 'style_template': item_doc.style_template}, "name")

    doc = ''
    if name:
        doc = frappe.get_doc("Customer Style", name)


    for d in item_doc.style_fields:
        customer_style = {}
        if doc:
            for data in doc.styles:
                if data.style_field == d.style_field:
                    customer_style = data

        elif d.default:
            customer_style = frappe.db.get_value('Customer Style Data', {'parent': customer, 'style_field': d.style_field,
                'style_template': item_doc.style_template}, ["style_value as style_name", "note", "image", "image_html as html_image", "idx"], as_dict=1) or {}


        if not customer_style and d.default:
            customer_style = d

        if customer_style and d.default:
            wo.append("style_fields",
                {"style_field": d.style_field,
                 "idx": customer_style.get('idx'),
                 "style_name": customer_style.get('style_name') or d.style_name,
                 "note": customer_style.get('note') or d.note,
                 "image": customer_style.get('image') or d.image,
                 "html_image": customer_style.get('html_image') or d.html_image})
def set_operations(wo, item_doc, args):
    if args.order_type and args.order_type in ['RTW/Alteration', 'Alteration', 'New Order']:
        if args.alteration_operation:
            data = frappe.db.get_value('Operation', args.alteration_operation, '*', as_dict=1) or {}
            wo.append('operations', {
                'operation': args.alteration_operation,
                'branch': get_user_branch(),
                'hour_rate': frappe.db.get_single_value('HR Settings', 'hour_rate'),
                'description': data.get('description'),
                'time_in_mins': data.get('default_time_in_mins'),
                'workstation': data.get('workstation'),
                'warehouse': data.get('warehouse')
            })
        else:
            for d in item_doc.operations:
                wo.append('operations', {
                    'operation': d.operation,
                    'description': d.description,
                    'hour_rate': d.hour_rate,
                    'employee': d.employee,
                    'employees': d.employees,
                    'is_subcontracted': d.is_subcontracted,
                    'time_in_mins': d.time_in_mins,
                    'branch': validate_branch(d.branch, d.other_branch),
                    'trials': d.trials,
                    'branch_dict': d.branch_dict,
                    'quality_check': d.quality_check,
                    'workstation': frappe.db.get_value('Operation', d.operation, 'workstation'),
                    'warehouse': d.warehouse
                })

def set_items(wo, item_doc, args):
    for d in item_doc.items:
        wo.append('items', {
            'item_code': d.item_code,
            'item_name': d.item_name,
            'supplier': frappe.db.get_value('Item', d.item_code, 'default_supplier'),
            'warehouse': frappe.db.get_value('Item', d.item_code, 'default_warehouse'),
            'description': d.description,
            'operation': d.operation,
            'stock_uom': d.stock_uom or frappe.db.get_value('Item', d.item_code, 'stock_uom'),
            'qty': d.qty * args.qty,
            'stock_qty': d.qty,
            'uom': d.stock_uom or frappe.db.get_value('Item', d.item_code, 'stock_uom')
        })

        if d.idx == 1 and d.operation:
            setattr(wo, "fabric_operation", d.operation)

def set_fabric_item(wo, args):
    if args.fabric_item_code:
        wo.fabric_warehouse = args.get("fabric_warehouse")
        wo.append('items', {
            'item_code': args.fabric_item_code,
            'item_name': args.fabric_item_name or frappe.db.get_value('Item', args.fabric_item_code, 'item_name'),
            'supplier': frappe.db.get_value('Item', args.fabric_item_code, 'default_supplier'),
            'warehouse': args.get("fabric_warehouse") or frappe.db.get_value('Item', args.fabric_item_code, 'default_warehouse'),
            'description': args.description,
            'operation': frappe.db.get_value('BOM Operation', 
                {'parent': args.fabric_item_code, 'parenttype': 'Item', 'idx':1}, 'operation'),
            'stock_uom': args.fabric_item_uom or frappe.db.get_value('Item', args.fabric_item_code, 'stock_uom'),
            'qty': args.fabric_qty,
            'stock_qty': args.fabric_qty,
            'uom': args.fabric_item_uom or frappe.db.get_value('Item', args.fabric_item_code, 'stock_uom')
        })

def validate_branch(branch, other_branch):
    if not other_branch: return branch

    branches = other_branch.split('\n')
    user_branch = get_user_branch()
    if user_branch in branches:
        return user_branch
    return branch

def cancel_event(doc, method):
    check_wo_link(doc)
    make_bin_for_fabric(doc, add_qty=False)

def check_wo_link(doc):
    for data in frappe.db.get_values('Work Order', {'sales_order': doc.name, 'docstatus': '<>2'}, 'name', as_dict=1):
        throw(_('Error: Sales Order {0}, is linked with Work Order {1}, delete Work Order first').format(doc.name, data.name))

@frappe.whitelist()
def get_supplier(item_code):
    return frappe.db.get_value('Item', item_code, ['default_supplier', 'default_warehouse'], as_dict=1)
@frappe.whitelist()
def get_item_codes(doctype, txt, searchfield, start, page_len, filters):
    if filters.get('item_code'):
        allowed_fabric = frappe.db.get_value('Item', filters.get('item_code'), 'allowed_raw_materials')
        if allowed_fabric:
            allowed_fabric = allowed_fabric.split('\n')
            return frappe.get_all('Item', fields=["name"], 
                filters={'name': ('in', allowed_fabric)}, as_list=1)

    return frappe.db.sql(""" select name, item_name from tabItem where (name like "%%%(txt)s%%" or
        item_name like "%%%(txt)s%%") limit %(start)s, %(page_len)s"""%{'txt': txt, 'start': start, 'page_len': page_len})
@frappe.whitelist()
def get_fabric(doctype, txt, searchfield, start, page_len, filters):
    if filters.get('item_code'):
        setting = frappe.db.get_single_value("Selling Settings","fabric_item")
        fabric = []
        fabric_item = []
        band = filters.get('band')
        allowed_fabric = frappe.db.get_value('Item', filters.get('item_code'), 'allowed_fabric_items')
        if allowed_fabric:
            allowed_fabric = allowed_fabric.split('\n')
            return frappe.get_all('Item', fields=["name","item_name","item_group"], 
                filters={'name': ('in', allowed_fabric)}, as_list=1)
        if band:
            items = []
            fabric = []
            fabric_item = []
            item_price = frappe.get_all('Item Price', fields=["item_code"],filters={'price_list': ('in', band)},as_list=1)
            for it in item_price:
                fabric.append(it)
            for y in fabric:
                if y:
                    fabric_item.append(y)
                main_item = frappe.get_all('Item', fields=["name","item_name"], 
                filters={'item_group': ('in', ('Fabric','Fabric Sample')),'name':('in',y)}, as_list=1)
                for x in main_item:
                    items.append(x)
            if items:

                if setting == 1:
                    return items
                else:
                    return frappe.db.sql("""select name,item_name,item_group from `tabItem`
			            where (tabItem.name in (name)) and
			            (name like {txt} or item_name like {txt} or item_group like {txt})""".format(key=searchfield,name=items,txt = frappe.db.escape('%{0}%'.format(txt))))
                #return items
            else:
                return frappe.db.sql(""" select name, item_name from tabItem where (item_group = "Fabric" or item_group = "Fabric Sample") and
                    (name like "%%%(txt)s%%" or item_name like "%%%(txt)s%%") limit %(start)s, %(page_len)s"""%{'txt': txt, 'start': start, 'page_len': page_len})

    return frappe.db.sql(""" select name, item_name from tabItem where (item_group = "Fabric" or item_group = "Fabric Sample") and
    (name like "%%%(txt)s%%" or item_name like "%%%(txt)s%%") limit %(start)s, %(page_len)s"""%{'txt': txt, 'start': start, 'page_len': page_len})


@frappe.whitelist()
def get_fabric_qty(parent, size, width, pattern):
    name = frappe.db.get_value('Product Bundle', {'new_item_code': parent}, 'name')
    if not name:
        qty = retrieve_fab_qty(parent, size, width, pattern)
    else:
        doc = frappe.get_doc('Product Bundle', name)
        qty = sum([retrieve_fab_qty(d.item_code, size, width, pattern) for d in doc.items])
    value = qty or 1
    return value

def retrieve_fab_qty(item_code, size , width, pattern):
    qty = frappe.db.get_value('Size Details', {'parent': item_code, 'size': size, 'width': width, 'pattern': pattern}, 'fabric_qty')
    return qty

@frappe.whitelist()
def get_data(name, table, fields):
    return frappe.get_all(table, fields=fields, filters = {'sales_order': name})


def customer_update_events(doc, method):
    if doc.meta.get_field('email_id'):
        create_contact(doc)

    if doc.get('address_line1'):
        create_address(doc)

def create_contact(doc):
    parent = frappe.db.get_value('Dynamic Link',
        {'link_doctype': 'Customer', 'link_name': doc.name, 'parenttype': 'Contact'}, 'parent')
    if doc.email_id and doc.phone and not parent:
        contact = frappe.get_doc({
            'doctype': 'Contact',
            'first_name': doc.customer_name,
            'email_id': doc.email_id,
            'mobile_no': doc.phone,
            'phone': doc.phone
        })

        contact.append('links', {
            'link_doctype': 'Customer',
            'link_name': doc.name
        })
        contact.save(ignore_permissions=True)
    elif parent:
        contact = frappe.get_doc('Contact', parent)
        if contact.email_id != doc.email_id or contact.mobile_no != doc.phone:
            contact.email_id = doc.email_id
            contact.mobile_no = doc.phone
            contact.save(ignore_permissions=True)

def create_address(args):
    parent = frappe.db.get_value('Dynamic Link',
        {'link_doctype': 'Customer', 'link_name': args.name, 'parenttype': 'Address'}, 'parent')

    if not parent:
        address = frappe.get_doc({
            'doctype': 'Address',
            'address_title': args.get('name'),
            'address_line1': args.get('address_line1'),
            'address_line2': args.get('address_line2'),
            'city': args.get('city'),
            'state': args.get('state'),
            'pincode': args.get('pincode'),
            'country': args.get('country'),
            'links': 
                [{
                    'link_doctype': args.get('doctype'),
                    'link_name': args.get('name')
                }]
        }).insert()

def validate_size(doc):
    for data in doc.items:
        if data.fabric_item_code and not data.size:
            frappe.throw(_("Size is not selected for fabric {0}").format(data.fabric_item_code))

def autoname(self, method):
    if frappe.db.get_single_value("Selling Settings", "transaction_branch_bundle"):
        from frappe.model.naming import make_autoname
        from tailorpad.custom_folder.custom_stock import get_user_warehouse, get_user_branch
        abbr = frappe.db.get_value('Branch', get_user_branch(), 'branch_abbreviation')
        if abbr:
            self.name = make_autoname(abbr+'.#####')

def update_events_so(doc, method):
    update_delivery_date(doc)

def update_delivery_date(doc):
    delivery_date = [getdate(d.delivery_date) for d in doc.items if d.delivery_date]
    if len(delivery_date) > 0:
        doc.delivery_date = min(delivery_date)

    trial_date = [getdate(d.trial_date) for d in doc.items if d.trial_date]
    if len(trial_date) > 0:
        doc.trial_date = min(trial_date)

def update_events_qo(doc, method):
    pass
@frappe.whitelist()
def old_measurement_data(doctype, txt, searchfield, start, page_len, filters):
    return frappe.db.sql("""select 
        distinct measurement_template from `tabCustomer Measurement Data` where parent = %(customer)s
        and name like %(txt)s limit {0}, {1}""".format(start, page_len),
        {"customer": filters.get('customer'), "txt": ("%%%s%%" % txt)})
@frappe.whitelist()
def old_garment_measurement_data(doctype, txt, searchfield, start, page_len, filters):
    return frappe.db.sql("""select 
        distinct measurement_template from `tabGarment Measurement Data` where parent = %(customer)s
        and name like %(txt)s limit {0}, {1}""".format(start, page_len),
        {"customer": filters.get('customer'), "txt": ("%%%s%%" % txt)})
@frappe.whitelist()
def old_alteration_measurement_data(doctype, txt, searchfield, start, page_len, filters):
    return frappe.db.sql("""select 
        distinct measurement_template from `tabAlteration Measurement Data` where parent = %(customer)s
        and name like %(txt)s limit {0}, {1}""".format(start, page_len),
        {"customer": filters.get('customer'), "txt": ("%%%s%%" % txt)})
@frappe.whitelist()
def new_measurement_data(doctype, txt, searchfield, start, page_len, filters):
    return frappe.db.sql("""select name,item_name from `tabItem` where item_group = 'Bespoke' and name not in(select 
        measurement_template from `tabCustomer Measurement Data` where parent = %(customer)s)
        and name like %(txt)s limit {0}, {1}""".format(start, page_len),
        {"customer": filters.get('customer'), "txt": ("%%%s%%" % txt)})
@frappe.whitelist()
def new_garment_measurement_data(doctype, txt, searchfield, start, page_len, filters):
    return frappe.db.sql("""select name,item_name from `tabItem` where item_group = 'Bespoke' and name not in(select 
        measurement_template from `tabGarment Measurement Data` where parent = %(customer)s)
        and name like %(txt)s limit {0}, {1}""".format(start, page_len),
        {"customer": filters.get('customer'), "txt": ("%%%s%%" % txt)})   
@frappe.whitelist()
def new_alteration_measurement_data(doctype, txt, searchfield, start, page_len, filters):
    return frappe.db.sql("""select name,item_name from `tabItem` where item_group = 'Bespoke' and name not in(select 
        measurement_template from `tabAlteration Measurement Data` where parent = %(customer)s)
        and name like %(txt)s limit {0}, {1}""".format(start, page_len),
        {"customer": filters.get('customer'), "txt": ("%%%s%%" % txt)})
@frappe.whitelist()
def old_style_data(doctype, txt, searchfield, start, page_len, filters):
    return frappe.db.sql("""select 
        distinct style_template from `tabCustomer Style Data` where parent = %(customer)s
        and name like %(txt)s limit {0}, {1}""".format(start, page_len),
        {"customer": filters.get('customer'), "txt": ("%%%s%%" % txt)})
@frappe.whitelist()
def old_product_data(doctype, txt, searchfield, start, page_len, filters):
    return frappe.db.sql("""select 
        distinct product_option from `tabCustomer Product Data` where parent = %(customer)s
        and name like %(txt)s limit {0}, {1}""".format(start, page_len),
        {"customer": filters.get('customer'), "txt": ("%%%s%%" % txt)})

@frappe.whitelist()
def new_style_data(doctype, txt, searchfield, start, page_len, filters):
    return frappe.db.sql("""select name,item_name from `tabItem` where item_group = 'Bespoke' and name not in(select distinct 
        style_template from `tabCustomer Style Data` where parent = %(customer)s)
        and name like %(txt)s limit {0}, {1}""".format(start, page_len),
        {"customer": filters.get('customer'), "txt": ("%%%s%%" % txt)})
@frappe.whitelist()
def new_product_data(doctype, txt, searchfield, start, page_len, filters):
    return frappe.db.sql("""select name,item_name from `tabItem` where item_group = 'Bespoke' and name not in(select distinct 
        product_option from `tabCustomer Product Data` where parent = %(customer)s)
        and name like %(txt)s limit {0}, {1}""".format(start, page_len),
        {"customer": filters.get('customer'), "txt": ("%%%s%%" % txt)})

@frappe.whitelist()
def get_completed_serialno(doctype, txt, searchfield, start, page_len, filters):
    return frappe.db.sql("""
        select name from `tabSerial No`
            where completed = 1 and name like %(txt)s""",
        {'txt': "%%%s%%" % txt})


def update_events_si(doc, method):
    make_payment_request(doc, doc.grand_total)

def make_payment_request(doc, amount):
    if doc.on_submit_make_payment_request and amount:
        if doc.contact_person:
            contact = get_contact_details(doc.contact_person)
            if contact and contact.get('contact_email'):
                payment_account_data = frappe.db.get_value('Payment Gateway Account', 
                    {'payment_gateway': 'Stripe', 'is_default': 1}, ['payment_account', 'name', 'currency'], as_dict=1)

                payment_doc = frappe.get_doc({
                    'doctype': 'Payment Request',
                    'print_format': 'Standard',
                    'email_to': contact.get('contact_email'),
                    'subject': 'Payment Request for {0}'.format(doc.name),
                    'payment_gateway_account': payment_account_data.get('name'),
                    'currency': payment_account_data.get('currency'),
                    'grand_total': amount,
                    'message': get_message(doc),
                    'reference_doctype': doc.doctype,
                    'reference_name': doc.name
                }).insert(ignore_permissions=True)

                payment_doc.submit()
        else:
            frappe.throw(_("Make contact against customer {0}".format(doc.customer)))

def get_message(doc):
    amount_field = "advance_payment_amount" if doc.doctype == 'Sales Order' else "grand_total"

    return ('''
        <p>Dear {{ doc.customer_name }},</p>
        <p>Requesting payment for {{ doc.doctype }}, {{ doc.name }} for {{ doc.get('%s') }}.</p>
        <a href="{{ payment_url }}"> click here to pay </a>''' %(amount_field))


def customer_validate_events(doc, method):
    if doc.phone:
        l = len(doc.phone)
        if(l<11):
            frappe.msgprint("Warning: Mobile No is not allow less than eleven digits")
            doc.phone = ''
    mobile = frappe.db.get_single_value("Selling Settings", "mobile_no")
    if doc.doctype == "Customer":
        if mobile==1 and not doc.phone:
            frappe.throw("Mobile No is Mandatory")
    if doc.new_style_template and doc.style_template:
        frappe.throw(_("Either select New Style Template or Available Style Template"))

    if doc.new_measurement_template and doc.measurement_template:
        frappe.throw(_("Either select New Measurement Template or Available Measurement Template"))

    if doc.new_measurement_template or doc.measurement_template:
        update_measurement_data(doc)

    if doc.style_template or doc.new_style_template:
        update_style_data(doc)

def make_bin_for_fabric(doc, add_qty=True):
    for d in doc.items:
        if d.fabric_item_code:
            warehouse = d.get("fabric_warehouse") or frappe.db.get_value('Item', d.fabric_item_code, 'default_warehouse')
            make_bin_for_item_and_warehouse(d.fabric_item_code, warehouse, d.fabric_qty, add_qty=add_qty)

def make_bin_for_item_and_warehouse(item_code, warehouse, qty, add_qty = True):
    bin_name = frappe.db.get_value('Bin',
        {'item_code': item_code, 'warehouse': warehouse}, 'name')

    if bin_name:
        bin_doc = frappe.get_doc("Bin", bin_name)
    else:
        bin_doc = frappe.new_doc("Bin")
        bin_doc.item_code = item_code
        bin_doc.warehouse = warehouse
        bin_doc.reserved_qty = 0

    if add_qty:
        bin_doc.reserved_qty += qty
    else:
        bin_doc.reserved_qty -= qty

    bin_doc.save(ignore_permissions=True)

def update_measurement_data(doc):
    if doc.type_of_measurement == "New" and doc.new_measurement_template:
        for v in doc.measurement_fields:
            mfs = doc.append("customer_measurement_data", {})
            mfs.measurement_template = doc.new_measurement_template
            mfs.measurement_field = v.measurement_field
            mfs.note = v.note
            mfs.measurement_value = v.measurement_value
            mfs.image = v.image
            mfs.image_html = v.image_html
        doc.measurement_template = doc.new_measurement_template
        doc.new_measurement_template = ''
    elif doc.type_of_measurement == "Update" and doc.measurement_template:
        m_fields = {}
        updated_mt = []
        for f in doc.measurement_fields:
            m_fields[f.measurement_field] = [f.measurement_value, f.image_html, f.note, f.image]

        for h in doc.customer_measurement_data:
            if h.measurement_template == doc.measurement_template and h.measurement_field in m_fields:
                h.measurement_value = m_fields[h.measurement_field][0]
                h.image_html = m_fields[h.measurement_field][1]
                h.note = m_fields[h.measurement_field][2]
                updated_mt.append(h.name)
                del m_fields[h.measurement_field]

        if m_fields:
            for key, val in m_fields.items():
                mfs = doc.append("customer_measurement_data", {})
                mfs.measurement_template = doc.measurement_template
                mfs.measurement_field = key
                mfs.note = val[2]
                mfs.measurement_value = val[0]
                mfs.image = val[3]
                mfs.image_html = val[1]

        if len(updated_mt) > 0:
            frappe.db.sql(""" delete from `tabCustomer Measurement Data`
                where parent = '%s' and measurement_template = '%s' and name not in (%s)
                """%(doc.name, doc.measurement_template, ','.join(['%s'] * len(updated_mt))), tuple(updated_mt))

def update_style_data(doc):
    if doc.type_of_style == "New" and doc.new_style_template:
        for v in doc.styles:
            mfs = doc.append("customer_style_data", {})
            mfs.style_template = doc.new_style_template
            mfs.style_field = v.style_field
            mfs.note = v.note
            mfs.style_value = v.style_name
            mfs.image = v.image
            mfs.image_html = v.html_image
        doc.style_template = doc.new_style_template
        doc.new_style_template = ''
    elif doc.type_of_style == "Update" and doc.style_template:
        m_fields = {}
        updated_mt = []
        for v in doc.styles:
            m_fields[v.style_field] = [v.style_name, v.html_image, v.note, v.style_field, v.image]

        for h in doc.customer_style_data:
            if h.style_template == doc.style_template and h.style_field in m_fields:
                h.style_value = m_fields[h.style_field][0]
                h.image_html = m_fields[h.style_field][1]
                h.image = m_fields[h.style_field][4]
                h.note = m_fields[h.style_field][2]

                updated_mt.append(h.name)
                del m_fields[h.style_field]

        if m_fields:
            for key, val in m_fields.items():
                mfs = doc.append("customer_style_data", {})
                mfs.style_template = doc.style_template
                mfs.style_field = key
                mfs.note = val[2]
                mfs.style_value = val[0]
                mfs.image = val[4]
                mfs.image_html = val[1]

        if len(updated_mt) > 0:
            frappe.db.sql(""" delete from `tabCustomer Style Data`
                where parent = '%s' and style_template = '%s' and name not in (%s)
                """%(doc.name, doc.style_template, ','.join(['%s'] * len(updated_mt))), tuple(updated_mt))

@frappe.whitelist()
def delete_templates(data_type, customer, template_name):
    template_field = "measurement_template" if data_type == 'Customer Measurement Data' else "style_template"
    frappe.db.sql(""" delete from `tab%s` where parent = %s and parenttype = 'Customer'
        and %s = %s""" % (data_type, '%s', template_field, '%s'), (customer, template_name), auto_commit=1)
@frappe.whitelist()
def delete_garment_templates(data_type, customer, template_name):
    template_field = "measurement_template" if data_type == 'Garment Measurement Data' else "style_template"
    frappe.db.sql(""" delete from `tab%s` where parent = %s and parenttype = 'Customer'
        and %s = %s""" % (data_type, '%s', template_field, '%s'), (customer, template_name), auto_commit=1)
@frappe.whitelist()
def delete_alteration_templates(data_type, customer, template_name):
    template_field = "measurement_template" if data_type == 'Alteration Measurement Data' else "style_template"
    frappe.db.sql(""" delete from `tab%s` where parent = %s and parenttype = 'Customer'
        and %s = %s""" % (data_type, '%s', template_field, '%s'), (customer, template_name), auto_commit=1)
@frappe.whitelist()
def delete_style_templates(data_type, customer, template_name):
    template_field = "style_template" if data_type == 'Customer Style Data' else "style_template"
    frappe.db.sql(""" delete from `tab%s` where parent = %s and parenttype = 'Customer'
        and %s = %s""" % (data_type, '%s', template_field, '%s'), (customer, template_name), auto_commit=1)
    # frappe.msgprint("Template data deleted successfully")

@frappe.whitelist()
def delete_product_option(data_type, customer, product_name):
    product_field = "product_option" if data_type == 'Customer Product Data' else "product_option"
    frappe.db.sql(""" delete from `tab%s` where parent = %s and parenttype = 'Customer'
        and %s = %s""" % (data_type, '%s', product_field, '%s'), (customer, product_name), auto_commit=1)
