# Copyright (c) 2021, White Hat Global and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.model.naming import make_autoname
from frappe.utils import cstr, flt, cint, now_datetime,nowdate,today,getdate,now,get_datetime,nowtime
from frappe.utils import flt, get_datetime, getdate, date_diff, cint, nowdate, get_link_to_form, time_diff_in_hours
from frappe import _
from tailorpad.custom_folder.custom_stock import get_user_warehouse, get_user_branch
#from erpnext.manufacturing.doctype.work_order.work_order import create_job_card

class ProductionOrder(Document):
    def onload(self):
        for i in self.production_order_table:
            wo_list = frappe.db.sql("""select name,item_code,docstatus from `tabWork Order` where sales_order = %s and item_code = %s and docstatus = %s""",(i.sales_order,i.production_item,'1'),as_dict=1)
            for j in wo_list:
                if i.production_item == j.item_code:
                    i.work_order = j.name
                
            #jc_list = frappe.db.sql("""select name, operation, status from `tabJob Card` where work_order = %s""",(i.work_order),as_dict=1)
            #frappe.msgprint('jc '+str(jc_list))
            #for k in jc_list:
            #   child = self.append('job_card',{})
            #   frappe.msgprint('out')
            #   child.job_card = k.name
            #   child.operation = k.operation
            #   child.status = k.status
            
                
    def validate(self):
        for o in self.get('production_order_table'):
            if o.get_operation == 1 and o.operation_updated == 0:
                wo = frappe.get_doc('Work Order',o.work_order)
                wo_len = len(wo.get("operations"))
        #       frappe.throw('WO '+str(wo_len))
                for n in wo.get('operations'):
                    self.append('job_card', {
                        "operation": n.operation,
                        "workstation": n.workstation,
                        "is_subcontracted": n.is_subcontracted,
                        "item_name": wo.item_code,
                        "qty": wo.item_qty,
                        "item_fabric_name": frappe.db.get_value('Item',wo.item_code,'item_name') + ',' + frappe.db.get_value('Item',wo.fabric_code,'item_name'), 
                       # "balance_qty": wo.item_qty,
                        "fabric_code": wo.fabric_code,
                        "status": n.status,
                        "warehouse": n.warehouse,
                      #  "assigned_qty": wo.item_qty,
                        "branch": n.branch,
                        "work_order":o.work_order
                    })
                        
                o.operation_updated = '1'

        a = now_datetime()
        if self.job_card:
            for i in self.get('job_card'):
                if i.operation == 'Cutting':
                    i.order_wise = '1'
                elif i.operation == 'Stitching':
                    i.order_wise = '2'
                elif i.operation == 'Finishing':
                    i.order_wise = '3'
                #else:
                #    a = [i for i in range(4,100)]
                #    i.order_wise = a
                
                #if i.qty == i.completed_qty and i.balance_qty == '0':
                #    i.completed = '1'
                #if i.balance_qty:
                #    i.completed = '0'

                if i.finished_qty and i.completed and i.completed_qty != flt(i.qty):
                    val = float(float(i.balance_qty) - float(i.finished_qty))
                    i.balance_qty = val
                    i.assigned_qty = val
                    #i.assigned_qty = val
                    i.completed_qty = float(float(i.completed_qty) + float(i.finished_qty))

               # for(var c=0; c<frm.doc.job_card.length; c++) {
                if(i.balance_qty != '0' and i.completed_qty != flt(i.qty)):
                   # frappe.msgprint('JCCCCCC '+str(i.balance_qty))
                    i.completed = '0'

                else:
                    i.completed = '1'
                    #i.finished_qty = '0'
                #if(i.assigned_qty == i.completed_qty):
                  #  frappe.msgprint('ELSE IF '+str(i.completed_qty))
                #    i.finished_qty = '0'

            #   if i.completed_qty:
            #       frappe.msgprint('com '+str(i.completed_qty) + str(i.assigned_qty))
            #       if i.completed_qty > i.assigned_qty:
            #           frappe.throw('Finished qty should not be greater than assigned qty in row number '+str(i.idx))

            #    if i.finished_qty == i.assigned_qty:
            #        i.balance_qty = '0'

                #if i.is_subcontracted and i.completed:
                #   po_status = frappe.db.get_value('Purchase Order',i.purchase_order,'status')
                #   if po_status != 'Completed':
                #       frappe.throw('This Operation Item Is Not Received Yet.So You Could Not Able To Complete.')

                #if i.completed and not i.finished_qty:
                #   frappe.throw('Finished Qty is Mandatory in row number '+str(i.idx))

            #    if i.completed == 1 and i.completed_qty == i.assigned_qty:
                    #frappe.msgprint('comp '+str(i.completed))
            #        i.to_time = a.strftime("%Y-%m-%d %H:%M:%S")
            #        i.finished_qty = i.completed_qty
			
                    #jc = frappe.get_doc('Job Card',i.job_card)
                    #jc.workstation = i.workstation
                    #for jb in jc:
                    #    for n in jb.get('time_logs'):
                    #        if i.employee == jb.employee:
                    #            n.to_time = i.to_time
                    #            n.completed_qty = i.completed_qty
                    #jc.submit()

                    #frappe.db.sql("""update `tabJob Card Time Log` set to_time = %s, completed_qty = %s, docstatus = %s where parent = %s""",(i.to_time,i.finished_qty,'1',i.job_card))
                    #frappe.msgprint('done')
                
        #for i in self.get('job_card'):
        #    order = frappe.db.get_single_value("Manufacturing Settings", 'follow_operations_order')
        #    if order == 1:
        #        if i.order_wise == '1' and not i.employee and i.operation and not i.job_card:
        #            i.employee = ''
        #            frappe.throw(str(i.operation) + ' has to be done first.')
        #        if i.order_wise == '2' and not i.employee and i.operation and not i.job_card:
        #            i.employee = ''
        #            frappe.throw(str(i.operation) + ' has to be done first.')
        #        if i.order_wise == '3' and not i.employee and i.operation and not i.job_card:
        #            i.employee = ''
        #            frappe.throw(str(i.operation) + ' has to be done first.')
        #     opn_one = []
        #        opn_two = []
        #        opn_three = []
        #        jc_one = frappe.get_all("Job Card Table",filters={"parent": self.name, 'order_wise': '1', 'completed': 0},fields=("order_wise","completed","operation","employee"))
        #        jc_two = frappe.get_all("Job Card Table",filters={"parent": self.name, 'order_wise': '2', 'completed': 0},fields=("order_wise","completed","operation","employee"))
        #        jc_three = frappe.get_all("Job Card Table",filters={"parent": self.name, 'order_wise': '3', 'completed': 0},fields=("order_wise","completed","operation","employee"))
        #        frappe.msgprint('jc_one '+str(jc_one) + ' two ' +str(jc_two) + ' three '+ str(jc_three))
        #        if jc_one:
        #            for i in jc_one:
        #                if i.order_wise == '1' and not i.employee:
        #                    opn_one.append(i.operation)
        #            len_one = len(opn_one)
        #            frappe.msgprint('OPN '+str(opn_one))
        #            if len_one > 0:
        #                for j in opn_one:
        #                   frappe.throw(str(j) + ' operation has to be done first')

        #        if jc_two:
        #            for j in jc_two:
        #                if j.order_wise == '2' and not j.employee:
        #                    frappe.msgprint('in')
        #                    opn_two.append(j.operation)
        #            len_two = len(opn_two)
        #            frappe.msgprint('OPN '+str(opn_two))
        #            if len_two > 0:
        #                for k in opn_two:

        #                    frappe.throw(str(k) + ' operation has to be done first')

        #        if jc_three:
        #            for l in jc_three:
        #                if l.order_wise == '3' and not l.employee:
        #                    opn_three.append(l.operation)
        #            len_three = len(opn_three)
        #            frappe.msgprint('OPN '+str(opn_three))
        #            if len_three > 0:
        #                for m in opn_three:
        #                    frappe.throw(str(m) + ' operation has to be done first')
                
@frappe.whitelist()
def create_po(docid,emp,opn,ws,rn):
    #frappe.msgprint('CAlled JB')
    auto_create = True
    enable_capacity_planning = False
    self = frappe.get_doc('Production Order',docid)

    #wo_oprn = frappe.get_doc('Work Order',work_order)
    #if wo_oprn.docstatus == 1 and not self.jc_created:
    for i in self.get('production_order_table'):
        wo_oprn = frappe.get_doc('Work Order',i.work_order)
        if wo_oprn.docstatus == 1 and emp:
            a = now_datetime()
            #for index, row in enumerate(self.job_card):
            #frappe.msgprint('i emp '+str(index) + ' row '+str(row))
            #create_job_card(self,row,docid,auto_create=True)
            #frappe.msgprint('jc cretd')
            doc = frappe.new_doc("Job Card")
            doc.update({
                        'work_order': i.work_order,
                        'operation': opn,
                        'workstation': ws,
                        'production_order': self.name,
                        'posting_date': nowdate(),
                        'emp': emp,
                        #'for_quantity': work_order.get('item_qty', 0),
                        #'for_quantity': row.job_card_qty or work_order.get('qty', 0),
                        'operation_id': rn,
                        'bom_no': wo_oprn.bom_no,
                        'project': wo_oprn.project,
                        'company': wo_oprn.company,
                        #'sequence_id': row.get("sequence_id"),
                        'wip_warehouse': wo_oprn.wip_warehouse,
                        #'hour_rate': row.get("hour_rate"),
                        #'serial_no': row.get("serial_no")
            })

            doc.append('time_logs', {
                'employee': emp,
                'from_time': a.strftime("%Y-%m-%d %H:%M:%S")
            })
            if wo_oprn.transfer_material_against == 'Job Card' and not wo_oprn.skip_transfer:
                doc.get_required_items()

            if auto_create:
                doc.flags.ignore_mandatory = True
                if enable_capacity_planning:
                    doc.schedule_time_logs(h.name)

                doc.insert()
                #frappe.msgprint(_("Job card {0} created").format(get_link_to_form("Job Card", doc.name)), alert=True)
                
                #frappe.db.sql("""update `tabProduction Order Table` set jc_created = %s where parent = %s""",('1',docid))              
                        #if h.operation == row.get('operation'):
                frm_time = a.strftime("%Y-%m-%d %H:%M:%S")
                #frappe.db.sql("""update `tabJob Card Table` set employee = %s, job_card = %s, from_time = %s where employee = %s""",(emp,doc.name,frm_time,emp))
                for h in self.get('job_card'):
                    #if h.employee:
                #   frappe.msgprint('innnnnn')
                #   h.job_card = doc.name
                #   h.employee = emp
                #   h.from_time = a.strftime("%Y-%m-%d %H:%M:%S")
                #   frappe.throw('last '+str(h.job_card) + str(h.from_time))
                #   h.save()
                    if rn == h.name:
                        #frappe.db.set_value('Job Card Table',h.name,'job_card',doc.name)
                        h.job_card = doc.name
                        h.employee = emp
                        h.from_time = a.strftime("%Y-%m-%d %H:%M:%S")
                        frappe.db.sql("""update `tabJob Card Table` set job_card = %s, employee = %s, from_time = %s where name = %s and parent = %s""",(doc.name,emp,frm_time,h.name,self.name))
                       # h.save()
                        #self.save()
                        #self.reload()
                        #frappe.throw('jjjj '+str(h.job_card))
                        #frappe.db.commit()
    #frappe.throw('last')
    #frappe.msgprint('JC '+str(doc.name))
    return doc.name, frm_time, rn

@frappe.whitelist()
def get_emp(doctype, txt, searchfield, start, page_len, filters):
    item_code = filters.get('item')
    opn = filters.get('operation')
    itm = frappe.get_doc('Item',item_code)
    for i in itm.get('operations'):
        if opn == i.operation:
            allowed_emp = i.employees
            if allowed_emp:
                allowed_emp = allowed_emp.split('\n')
                emp = frappe.get_all('Employee', fields=["name"],
                    filters={'name': ('in',allowed_emp)},as_list=1)
                return emp

@frappe.whitelist()
def gen_se(docid,item_code,serial_no):
       # frappe.throw("called")
        stock_entry = frappe.new_doc('Stock Entry')
        stock_entry.material_purpose = 'Material Receipt'
        stock_entry.purpose = 'Material Receipt'
        stock_entry.stock_entry_type = 'Material Receipt'
        stock_entry.branch = get_user_branch()
     #   for x in self.get("production_order_table"):
        stock_entry.append('items', {
                'item_code':item_code,
                'item_name':item_code,
                'qty':'1',
                'serial_no':serial_no,
                'uom':frappe.db.get_value("Item", item_code, 'stock_uom'),
                'stock_uom':frappe.db.get_value("Item", item_code, 'stock_uom'),
                'conversion_factor':1,
                'description':item_code,
                'target_warehouse':frappe.db.get_single_value("Stock Settings", "default_warehouse"),
                't_warehouse':frappe.db.get_single_value("Stock Settings", "default_warehouse")
            })
        stock_entry.submit()

@frappe.whitelist()
def gen_ser_no(docid,idx,fin):
    #frappe.throw('SER '+str(fin))
    self = frappe.get_doc('Production Order', docid)
    comp = []
    #c_qty = '0'
    ser_no = []
    ct = cint(fin)
   # cq = frappe.db.sql("""select finished_qty from `tabJob Card Table` where idx = %s and parent = %s""",(idx,docid))
   # frappe.throw('CQ '+str(cq))
    #row_count = len(self.get("job_card"))
    #frappe.msgprint('RC '+str(row_count) + ' IDX '+str(idx))
    #for i in self.get('job_card'):
        #if idx == row_count and i.completed:
        #    frappe.throw('COMP')
   # ct = cint(row_count) * cint(i.qty) + cint(1)
        #c_qty = len(i.name) * (str(i.completed_qty))
        #comp.append(ct)
   # frappe.throw('COM '+str(ct)) 

    for n in self.get('production_order_table'):   
        naming_series = n.sales_order + '/.##'

##    for r in range(cint(i.qty)):
    for r in range(ct):
        sn = frappe.new_doc('Serial No')
        sn.serial_no = make_autoname(naming_series)

        for j in self.get('job_card'):
            sn.item_code = j.item_name
           # sn.warehouse = frappe.db.get_single_value("Stock Settings", "default_warehouse")
            sn.save(ignore_permissions=True)
        
            if sn.name not in ser_no:
                ser_no.append(sn.name)               
        
    return ser_no
    #frappe.throw('SER NO '+str(ser_no))
    #    return sn.name
    #return ser_no
    #frappe.throw('SER '+str(ser_no))
#@frappe.whitelist()
#def set_ser_no(gen_ser_no,ser_no,pdn):
#    self = frappe.get_doc('Production Order',pdn)
   # if ser_no == '1':
    #if self.serial_no:
    #for s in ser_no:
    #    if self.serial_no:
    #        self.serial_no += '\n' + s
            
    #    else:
    #        self.serial_no = s

#    self.save()
    #self.reload()
    #return ser_no

@frappe.whitelist()
def update_jc(docid,row,comp,ws):
    #frappe.msgprint('update jc')
    self = frappe.get_doc('Production Order',docid)
    a = now_datetime()
    t = a.strftime("%Y-%m-%d %H:%M:%S")
    for i in self.get('job_card'):
        if row == i.name:
            #frappe.msgprint('name '+str(i.job_card))
            #i.to_time = t
            #i.finished_qty = comp
            
            jc = frappe.get_doc('Job Card',i.job_card)
            if jc.docstatus == '0':
                if i.operation == jc.operation:
                #   frappe.msgprint('in')
                    jc.workstation = ws
                    for j in jc.get('time_logs'):
                        if j.employee == i.employee and j.from_time:
                 #      frappe.msgprint('cond')
                        #j.to_time = i.to_time
                        #j.completed_qty = comp
                            frappe.db.sql("""update `tabJob Card Time Log` set to_time = %s, completed_qty = %s where parent = %s""",(t,comp,i.job_card))

            #       child = self.append('time_logs',{})
            #       child.employee = i.employee
            #       child.from_time = i.from_time
            #       child.to_time = i.to_time
            #       child.completed_qty = i.finished_qty
            #jc.save()
                jc.submit()
    #self.save()
    return row, t

@frappe.whitelist()
def set_qty(row,qty,docid,emp):
    self = frappe.get_doc('Production Order', docid)
    for i in self.get('job_card'):
        if row == i.name:
#            i.assigned_qty = qty
            i.employee = emp
          #  i.balance_qty = qty
    
    self.save()

@frappe.whitelist()
def val_order_wise(row,order,docid,emp,prev_row,qty):
    if prev_row != '0':
        check_row_order = frappe.db.sql("""select employee, order_wise, idx, operation from `tabJob Card Table` where idx = %s and parent = %s""",(prev_row,docid),as_dict=1)
        #frappe.msgprint('CR '+str(check_row_order))
        for i in check_row_order:
            if i.operation == 'Cutting' and not i.employee:
                #i.employee = ''
                #i.save()
                if row:
                    frappe.db.sql("""update `tabJob Card Table` set employee = '' where employee = %s and name = %s and parent = %s""",(emp,row,docid))
                frappe.throw('Please Follow Operations Order Wise. Start with Cutting Operation.')

            elif i.operation == 'Striching' and not i.employee:
                if row:
                    frappe.db.sql("""update `tabJob Card Table` set employee = '' where employee = %s and name = %s and parent = %s""",(emp,row,docid))
                frappe.throw('Please Follow Operations Order Wise. Start with Striching Operation.')

            elif i.operation == 'Finishing' and not i.employee:
                if row:
                    clear_emp = frappe.db.sql("""update `tabJob Card Table` set employee = '' where employee = %s and name = %s and parent = %s""",(emp,row,docid))
                frappe.throw('Please Follow Operations Order Wise. Start with Finishing Operation.')

@frappe.whitelist()
def get_prev_completed_qty(row,order,docid,emp,prev_row,qty):
    #frappe.msgprint('row '+str(prev_row))
    get_prv_qty = frappe.db.sql("""select completed_qty from `tabJob Card Table` where idx = %s and parent = %s""",(prev_row,docid),as_dict=1)
    if get_prv_qty:
        for i in get_prv_qty:
            return i.completed_qty, row
    #else:
    #    return False
    

@frappe.whitelist()
def get_users_wo_operation(production_order, item_code):
   # frappe.msgprint('POr '+str(production_order) + ' === '+str(item_code))
    branch = {}
    user_branch = get_user_branch()
    doc = frappe.get_doc('Production Order', production_order)
    for d in doc.job_card:
      #  frappe.msgprint('UB '+str(user_branch))
     #   if d.warehouse and d.warehouse == user_branch:
        if d.branch and d.branch == user_branch:
    #        frappe.msgprint('IN IF')
            branch[d.operation] = frappe.db.get_value('BOM Operation', {'parent': item_code, 'operation': d.operation}, 'time_in_mins')

    return branch

@frappe.whitelist()
def get_users_wo_operation_data(production_order, item_code):
   # frappe.msgprint('PRO '+str(production_order) + ' IC '+str(item_code))
    branch = get_users_wo_operation(production_order, item_code)
    operation = ','.join(branch.keys())
   # frappe.msgprint('OPER '+str(operation))
    
    return  operation

@frappe.whitelist()
def issue_raw_material(work_order, operation=None):
    filters = {'parenttype': 'Work Order', 'parent': work_order}

    if operation:
        filters["operation"] = operation

    data = frappe.get_all('BOM Item',
        filters = filters, fields =['*'])

    stock_entry = frappe.new_doc('Stock Entry')
    stock_entry.material_purpose = 'Material Issue'
    stock_entry.purpose = 'Material Issue'
    stock_entry.stock_entry_type = 'Material Issue'
    stock_entry.branch = get_user_branch()
    for d in data:
        stock_entry.append('items', {
			'item_code': d.item_code,
			'item_name': d.item_name,
			'qty': d.qty,
			'uom': frappe.db.get_value("Item", d.item_code, 'stock_uom'),
			'stock_uom': frappe.db.get_value("Item", d.item_code, 'stock_uom'),
			'conversion_factor': 1,
			'description': d.description,
			's_warehouse': get_user_warehouse(),
			'work_order': work_order
            })
    return stock_entry

@frappe.whitelist()
def get_prev_val(prev_id,row,docid):
    if prev_id != '0':
        val = frappe.db.sql("""select assigned_qty, finished_qty, completed_qty, qty from `tabJob Card Table` where idx = %s and parent = %s and completed = %s""",(prev_id,docid,'0'),as_dict=1)
        if val:
            for i in val:
                if i.completed_qty == flt(i.qty):
                #if i.assigned_qty == '0.0':
                    return 'add', i.finished_qty

                else:
                    return 'no add', i.finished_qty
        else:
            return 'False'
