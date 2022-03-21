from __future__ import unicode_literals
import frappe, json
from frappe.utils import cstr, cint, flt
from frappe import _, throw

def get_user_branch():
    branch = frappe.db.get_value('User', frappe.session.user, 'branch')
    if not branch:
        frappe.throw(_("Set branch for user {0}").format(frappe.session.user))
    return branch

def get_user_warehouse(branch=None):
    if not branch:
        branch = get_user_branch()
    warehouse = frappe.db.get_value('Branch', branch, 'warehouse')
    return warehouse

def get_warehouse_branch(warehouse):
    return frappe.db.get_value('Branch', {'warehouse': warehouse}, 'name')

def get_bundle_abbreviation():
    branch = get_user_branch()
    bundle_abbreviation = frappe.db.get_value('Branch', branch, 'bundle_abbreviation')
    return bundle_abbreviation

def get_branch_abbreviation():
    branch = get_user_branch()
    branch_abbreviation = frappe.db.get_value('Branch', branch, 'branch_abbreviation')
    return branch_abbreviation

def stock_events(doc, method):
    pass

def onsubmit_stock_events(doc, method):
    if doc.material_purpose == 'Material Out':
        target_warehouse = get_target_warehouse(doc)
        ste = frappe.get_doc({
            'doctype': 'Stock Entry',
            'material_purpose': 'Material In',
            'branch': get_warehouse_branch(target_warehouse),
            'purpose': 'Material Receipt',
            'items': add_items(doc)
        }).insert(ignore_permissions=True)

def get_target_warehouse(doc):
    for data in doc.items:
        return data.target_warehouse

def add_items(doc):
    items = []
    for data in doc.items:
        items.append({
            'item_code': data.item_code,
            'source_warehouse': data.source_warehouse,
            'target_warehouse': data.target_warehouse,
            't_warehouse': data.target_warehouse,
            'qty': data.qty,
            'serial_no': data.serial_no,
            'work_order': data.work_order
        })

    return items

@frappe.whitelist()
def make_work_order(work_orders):
    from tailorpad.custom_folder.custom_selling import prepare_data_for_wo
    if isinstance(work_orders, basestring):
        work_orders = json.loads(work_orders)


    doc = frappe._dict()

    wo_list = []

    for data in work_orders:
        for d in range(1, cint(data.get('qty')) + 1):
            args = frappe._dict({
                'item_code': data.get('parent'),
                'qty': d,
                'fabric_item_code': data.get('fabric_code'),
                'fabric_qty': data.get('fabric_qty'),
                'size': data.get('size'),
                'order_type': 'RTW'
            })

            wo = prepare_data_for_wo(doc, args, 1)
            
            wo_list.append(wo.name)

    for d in wo_list:
        frappe.msgprint("Created work order {0}".format(d))

    return wo_list

@frappe.whitelist()
def fetch_customer_measurement(measurement_template, parent):
    data = frappe.db.get_values('Customer Measurement Data', {'parent': parent, 'measurement_template': measurement_template}, '*', order_by='idx', as_dict=1)
    if data:
        new_data = get_newly_added_data(measurement_template, parent)
        if new_data: data.extend(new_data)
        return data, 'Update'
    elif measurement_template:
        return fetch_measurement(measurement_template), 'New'
@frappe.whitelist()
def fetch_itemgarment_measurement(measurement_template, parent):
    data = frappe.db.get_values('Garment Measurement Data', {'parent': parent, 'measurement_template': measurement_template}, '*', order_by='idx', as_dict=1)
    if data:
        new_data = get_newly_added_data(measurement_template, parent)
        if new_data: data.extend(new_data)
        return data, 'Update'
    elif measurement_template:
        return fetch_measurement1(measurement_template), 'New'

@frappe.whitelist()
def fetch_itemalteration_measurement(measurement_template, parent):
    data = frappe.db.get_values('Alteration Measurement Data', {'parent': parent, 'measurement_template': measurement_template}, '*', order_by='idx', as_dict=1)
    if data:
        new_data = get_newly_added_data(measurement_template, parent)
        if new_data: data.extend(new_data)
        return data, 'Update'
    elif measurement_template:
        return fetch_measurement2(measurement_template), 'New'

@frappe.whitelist()
def fetch_customer_measurement1(measurement_template, parent):
    data = frappe.db.get_values('Garment Measurement Data', {'parent': parent, 'measurement_template': measurement_template}, '*', order_by='idx', as_dict=1)
    if data:
        new_data = get_newly_added_data1(measurement_template, parent)
        if new_data: data.extend(new_data)
        return data, 'Update'
    elif measurement_template:
        return fetch_measurement1(measurement_template), 'New'
@frappe.whitelist()
def fetch_customer_measurement2(measurement_template, parent):
    data = frappe.db.get_values('Alteration Measurement Data', {'parent': parent, 'measurement_template': measurement_template}, '*', order_by='idx', as_dict=1)
    if data:
        new_data = get_newly_added_data2(measurement_template, parent)
        if new_data: data.extend(new_data)
        return data, 'Update'
    elif measurement_template:
        return fetch_measurement2(measurement_template), 'New'
@frappe.whitelist()
def fetch_customer_style(style_template, parent):
    data = frappe.db.get_values('Customer Style Data', {'parent': parent, 'style_template': style_template}, '*', order_by='idx', as_dict=1)
    if data:
        new_data = get_newly_added_style_data(style_template, parent)

        if new_data: data.extend(new_data)
        return data, 'Update'
    elif style_template:
        return fetch_new_style(style_template), 'New'

@frappe.whitelist()
def fetch_customer_product(product_option, parent):
    data = frappe.db.get_values('Customer Product Data', {'parent': parent, 'product_option': product_option}, '*', order_by='idx', as_dict=1)
    if data:
        new_data = get_newly_added_product_data(product_option, parent)
        if new_data: data.extend(new_data)
        return data, 'Update'
    elif product_option:
        return fetch_new_product(product_option), 'New'

def fetch_new_product(product_option):
    return frappe.db.get_values('Item Product',
        {'parent': product_option,'parenttype':'Item','parentfield':'product_fields','default': 1}, '*', order_by='idx', as_dict=1)
def fetch_new_style(style_template):
   # return frappe.db.get_values('Style fields', {'parent': style_template, 'parentfield': 'style_fields', 'default': 1}, '*', order_by='idx', as_dict=1)
    return frappe.db.get_values('Item Style',
        {'parent': style_template,'parenttype':'Item','parentfield':'style_fields','default': 1}, '*', order_by='idx', as_dict=1)

@frappe.whitelist()
def fetch_item_measurement(measurement_template):
    return frappe.db.get_values('Measurement Fields',
        {'parent': measurement_template, 'parenttype': 'Measurement Template'}, '*', order_by='idx', as_dict=1)


@frappe.whitelist()
def fetch_measurement(measurement_template):
    #frappe.db.get_values('Measurement Fields',
     #   {'parent': measurement_template, 'parenttype': 'Measurement Template'}, '*', order_by='idx', as_dict=1)
    return frappe.db.get_values('Measurement Fields',
        {'parent': measurement_template,'parenttype':'Item','parentfield':'body_measurement'}, '*', order_by='idx', as_dict=1)

@frappe.whitelist()
def fetch_measurement1(measurement_template):
    return frappe.db.get_values('Garment Measurement Fields',
        {'parent': measurement_template,'parenttype':'Item','parentfield':'measurement_fields'}, '*', order_by='idx', as_dict=1)

@frappe.whitelist()
def fetch_measurement2(measurement_template):
    return frappe.db.get_values('Alteration Measurement Fields',
        {'parent': measurement_template,'parenttype':'Item','parentfield':'alteration_fields'}, '*', order_by='idx', as_dict=1)

@frappe.whitelist()
def fetch_body_measurement(measurement_template):
    return frappe.db.get_values('Measurement Fields',
        {'parent': measurement_template, 'parenttype': 'Measurement Template'}, '*', order_by='idx', as_dict=1)    

@frappe.whitelist()
def fetch_style(style_template):
   return frappe.db.get_values('Style fields', {'parent': style_template, 'parenttype': 'Style Template'}, '*', order_by='idx', as_dict=1)

@frappe.whitelist()
def fetch_product(product_option):
    return frappe.db.get_values('Product Fields', {'parent': product_option, 'parenttype': 'Product Options'}, '*', order_by='idx', as_dict=1)

@frappe.whitelist()
def update_customer_measurements(parent, measurement_template, query_set):
    if query_set:
        frappe.db.sql(""" update `tabCustomer Measurement Data` set measurement_value = (case measurement_field {query_set} end)
            where parent = '{parent}' and
            measurement_template = '{measurement_template}'""".
            format(query_set=query_set, parent= parent, measurement_template= measurement_template), auto_commit=1)

def get_newly_added_data(measurement_template, parent):
    return frappe.db.sql("""select * from `tabMeasurement Fields` where
            parent = '{measurement_template}' and parenttype='Measurement Template' and
            measurement_field not in(select measurement_field
            from `tabCustomer Measurement Data` where parent ='{customer}' and measurement_template = '{measurement_template}')
                """.format(measurement_template = measurement_template, customer = parent), as_dict=1)
def get_newly_added_data1(measurement_template, parent):
    return frappe.db.sql("""select * from `tabMeasurement Fields` where
            parent = '{measurement_template}' and parenttype='Measurement Template' and
            measurement_field not in(select measurement_field
            from `tabGarment Measurement Data` where parent ='{customer}' and measurement_template = '{measurement_template}')
                """.format(measurement_template = measurement_template, customer = parent), as_dict=1)
def get_newly_added_data2(measurement_template, parent):
    return frappe.db.sql("""select * from `tabMeasurement Fields` where
            parent = '{measurement_template}' and parenttype='Measurement Template' and
            measurement_field not in(select measurement_field
            from `tabAlteration Measurement Data` where parent ='{customer}' and measurement_template = '{measurement_template}')
                """.format(measurement_template = measurement_template, customer = parent), as_dict=1)
def get_newly_added_style_data(style_template, parent):
    return frappe.db.sql("""select * from `tabStyle fields` where
            parent = '{style_template}' and parenttype='Style Template' and
            style_field not in(select style_field
            from `tabCustomer Style Data` where parent ='{customer}' and style_template = '{style_template}')
                """.format(style_template = style_template, customer = parent), as_dict=1)
def get_newly_added_product_data(product_option, parent):
    return frappe.db.sql("""select * from `tabProduct Fields` where
            parent = '{product_option}' and parenttype='Product Options' and
            product_field not in(select product_field
            from `tabCustomer Product Data` where parent ='{customer}' and product_option = '{product_option}')
                """.format(product_option = product_option, customer = parent), as_dict=1)

@frappe.whitelist()
def bom_creation(docid):
    self = frappe.get_doc("Item",docid)
    for index, row in enumerate(self.items):
        create_bom(self,row)
        
def create_bom(self,row):
    bom = frappe.new_doc("BOM")
    bom.item = self.name
    bom.quantity = row.get("qty")
    item_table = bom.append('items', {})
    item_table.item_code = row.get("item_code")
    item_table.qty = row.get("qty")
    if self.operations:
        bom.with_operations = "1"
        for x in self.operations:
            child_table = bom.append('operations', {})
            child_table.operation = x.operation
            child_table.branch = x.branch
            child_table.time_in_mins = x.time_in_mins
            child_table.hour_rate = x.hour_rate
    
    bom.save(ignore_permissions=True)
    self.default_bom = bom.name
    self.save()
@frappe.whitelist()
def get_rawitem(doctype, txt, searchfield, start, page_len, filters):
    item_code = filters.get('item')
    allowed_raw = frappe.db.get_value('Item', item_code, 'allowed_raw_materials')
    if allowed_raw:
            allowed_raw = allowed_raw.split('\n')
            return frappe.get_all('Item', fields=["name"], 
                filters={'name': ('in', allowed_raw)}, as_list=1)

    return frappe.db.sql(""" select name, item_name from tabItem where item_group = 'Raw Material' and (name like "%%%(txt)s%%" or
        item_name like "%%%(txt)s%%") limit %(start)s, %(page_len)s"""%{'txt': txt, 'start': start, 'page_len': page_len})

@frappe.whitelist()
def get_fabricitem(doctype, txt, searchfield, start, page_len, filters):
    item_code = filters.get('item')
    allowed_fabric = frappe.db.get_value('Item', item_code, 'allowed_fabric_items')
    if allowed_fabric:
            allowed_fabric = allowed_fabric.split('\n')
            return frappe.get_all('Item', fields=["name"], 
                filters={'name': ('in', allowed_fabric)}, as_list=1)

    return frappe.db.sql(""" select name, item_name from tabItem where item_group = 'Raw Material' and (name like "%%%(txt)s%%" or
        item_name like "%%%(txt)s%%") limit %(start)s, %(page_len)s"""%{'txt': txt, 'start': start, 'page_len': page_len})
@frappe.whitelist()
def get_item(doctype, txt, searchfield, start, page_len, filters):

            item_code = filters.get('item_code')
            items = []
            l1 = []
            main_item = frappe.get_all('Raw Material', fields=["raw_material_code"], 
                filters={'parent': ('in', item_code)}, as_list=1)
            for x in main_item:
                    items.append(x)
            for res in items:
                    l1.append(res[0])
            return items
          
@frappe.whitelist()
def get_rm_items(doctype, txt, searchfield, start, page_len, filters):
    if not filters:
        return []

    filters = frappe._dict(filters)
    item_code = filters.get('item_code')
    if item_code: 
        doc = frappe.get_doc('Item', filters.item_code)
        items = []
        fabric = []
        fabric_item = []
        #item_price = frappe.get_all('Item Price', fields=["item_code"],filters={'price_list': ('in', band)},as_list=1)
        #for it in item_price:
         #   fabric.append(it)
        #for y in fabric:
         #   if y:
          #      fabric_item.append(y)
        main_item = frappe.get_all('Raw Material', fields=["raw_material_code","item_name"], 
        filters={'parent': ('in', item_code)}, as_list=1)
        for x in main_item:
                items.append(x)
        if items:
            return items
        else:
            return frappe.db.sql(""" select name,item_name from tabItem where (item_group = "Raw Material") and
                (name like "%%%(txt)s%%" or item_name like "%%%(txt)s%%") limit %(start)s, %(page_len)s"""%{'txt': txt, 'start': start, 'page_len': page_len})
@frappe.whitelist()
def raw_items(doctype, txt, searchfield, start, page_len, filters):
                return frappe.db.sql(""" select name,item_name from tabItem where (item_group = "Raw Material") and
                (name like "%%%(txt)s%%" or item_name like "%%%(txt)s%%") limit %(start)s, %(page_len)s"""%{'txt': txt, 'start': start, 'page_len': page_len})

@frappe.whitelist()
def get_item_details(item_code,item,size):
    qty = []
    raw_item = frappe.db.sql("""select quantity from `tabRaw Material` where raw_material_code = %s and parent = %s and size = %s""",(item_code,item,size),as_dict=True)
    for x in raw_item:
        qty.append(x.quantity)
    if qty:
        return qty
@frappe.whitelist()
def raw_material_details(item):
    items = []
    raw_item = frappe.db.sql("""select raw_material_code from `tabRaw Material` where parent = %s""",item,as_dict=True)
    for x in raw_item:
        items.append(x.raw_material_code)
    return items
@frappe.whitelist()
def get_bomitem_details(item_code,item,size):
        group = frappe.db.get_value("Item",item_code,"item_sub_group")
        qty = []
        raw_qty = []
        grp_qty = []
        raw_items = frappe.db.sql("""select quantity from `tabRaw Material` where raw_material_code = %s and parent = %s and size = %s""",(item_code,item,size),as_dict=True)
        if raw_items:
            for x in raw_items:
                raw_qty.append(x.quantity)
            if raw_qty:
                return raw_qty

        group_items = frappe.db.sql("""select quantity from `tabRaw Material` where item_sub_group = %s and parent = %s and size = %s""",(group,item,size),as_dict=True)
        if group_items:
            for x in group_items:
                grp_qty.append(x.quantity)
            if grp_qty:
                return grp_qty

        raw_item = frappe.db.sql("""select qty from `tabBOM Item` where item_code = %s and parent = %s""",(item_code,item),as_dict=True)
        if raw_item:
            for y in raw_item:
                qty.append(y.qty)
            if qty:
                return qty

@frappe.whitelist()
def cost_to_customer(item_code,doc,customer):
    customer = frappe.db.sql("""select sum(cost_to_customer) from `tabWO Product Field` where parent = %s""",customer,as_list=True)
    if customer:
        for value in customer:
            return value
@frappe.whitelist()
def style_cost_to_customer(item_code,doc,customer):
    customer = frappe.db.sql("""select sum(cost_to_customer) from `tabWO Style Field` where parent = %s""",customer,as_list=True)
    if customer:
        for value in customer:
            return value