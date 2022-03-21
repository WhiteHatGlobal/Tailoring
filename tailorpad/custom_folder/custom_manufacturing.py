from __future__ import unicode_literals
import frappe
import json
from frappe.utils import cstr, cint, flt, nowdate
from frappe import _, throw
from tailorpad.custom_folder.custom_stock import get_user_warehouse, get_user_branch

@frappe.whitelist()
def get_manufacturing_process(production_order, work_order, item_code):
	branch_operations = get_users_wo_operation(production_order, item_code)
	return {
		"operations": branch_operations,
		"operation_info": get_operation_detail(production_order, work_order),
		"style_cost": get_style_cost(branch_operations, item_code),
		'latest_operation': get_latest_operation(branch_operations, production_order),
		"employees": get_employees_detail(production_order),
		"opt_trial_qc": get_trials_and_qc(production_order)
	}

@frappe.whitelist()
def get_users_wo_operation(production_order, item_code):
	branch = {}
	user_branch = get_user_branch()
	doc = frappe.get_doc('Production Order', production_order)
	for d in doc.operations:
		if d.branch and d.branch == user_branch:
			branch[d.operation] = frappe.db.get_value('BOM Operation', {'parent': item_code, 'operation': d.operation}, 'time_in_mins')

	return branch

@frappe.whitelist()
def get_users_wo_operation_data(production_order, item_code):
	branch = get_users_wo_operation(production_order, item_code)
	operation = ','.join(branch.keys())

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

def get_operation_detail(production_order, work_order):
	operation = {}
	if production_order:
		for data in frappe.get_all('Manufacturing Process',
			filters = {'production_order': production_order, 'work_order': work_order}, fields = ["*"]):
			operation[data.operation] = data
	return operation

def get_style_cost(branch_operations, item_code):
	operation_dict = {}
	for operation in branch_operations:
		cost = frappe.db.sql(""" select ifnull(sum(cost_to_tailor), 0) from `tabStyle fields`
			where parent = %s and operation = %s""", (item_code, operation))
		cost = cost[0][0] if cost and len(cost[0]) > 0 else 0
		operation_dict[operation] = cost

	return operation_dict

def get_trials_and_qc(production_order):
	opt = {}
	po = frappe.get_doc('Production Order', production_order)
	for data in po.operations:
		qc_trial_data = frappe._dict()
		qc_trial_data.quality_check = data.quality_check
		if data.trials:
			trials = get_trials_data(data)
			qc_trial_data["trials"] = trials
		opt.setdefault(data.operation, qc_trial_data)
	return opt

def get_trials_data(data):
	trial = {}
	branch_dict = json.loads(data.branch_dict)
	for key, value in branch_dict.items():
		trial.setdefault(value.get("trial"), value)
	return trial

def get_employees_detail(production_order):
	self = frappe.get_doc('Production Order', production_order)
	operation = tuple([d.operation for d in self.operations])
	employee = frappe._dict()
	for data in frappe.db.sql("""select `tabEmployee`.name, `tabEmployee Skill`.operation,`tabEmployee Skill`.operation_time,
		`tabEmployee Skill`.payment_type, `tabEmployee Skill`.wage
		from `tabEmployee`, `tabEmployee Skill` where `tabEmployee Skill`.parent = `tabEmployee`.name and
		`tabEmployee Skill`.operation in (%s) and item_code = '%s'"""%(','.join(['%s'] * len(operation)), self.production_item), operation, as_dict=1):
		employee.setdefault(data.name, {}).setdefault(data.operation, data)
	return employee

def get_latest_operation(branch_operations, production_order):
	operations = [d for d in branch_operations]
	doc = frappe.get_doc('Production Order', production_order)
	for data in doc.operations:
		if data.operation in operations and data.status != 'Completed':
			return data.operation
	return ""

@frappe.whitelist()
def assign_serial_no_to_employee(args, production_order, item_code, work_order):
	args = json.loads(args)
	validate_previous_operation_completed(production_order, args)
	serial_no = args.get('completed_serial_no').split('\n')
	for data in serial_no:
		status = frappe.db.get_value('Serial No Track', {'parent': data, 'operation': args.get('operation')}, 'status')
		if status=='Pending' or status not in['Assign', 'Completed']:
			update_serial_no_status(production_order, args.get('operation'), data, 'Assign', args.get('employee'))
		else:
			frappe.throw(_("Serial no {0} is already {1}").format(data, status))

	update_production_order_status(production_order, args.get('operation'), 'Work in Progress')
	update_po_status(production_order)
	update_manufacturing_process(args, production_order, item_code, work_order, 'Pending')

def validate_previous_operation_completed(production_order, args):
	if not args.get('employee'):
		frappe.throw("Select employee")
	operation = args.get('operation')
	po_doc = frappe.get_doc('Production Order', production_order)
	status = []
	for d in po_doc.operations:
		if d.operation == operation:
			if status and len(set(status))>1:
				frappe.throw("Complete the dependent operation first")
			break
		status.append(d.status)

@frappe.whitelist()
def complete_serial_no_to_employee(args, production_order, item_code, work_order):
	args = json.loads(args)
	if not args.get('completed_serial_no'):
		frappe.throw("select serial nos")

	serial_no = args.get('completed_serial_no').split('\n')
	qty = 0
	for data in serial_no:
		if data:
			qty += 1
			status = frappe.db.get_value('Serial No Track', {'parent': data, 'operation': args.get('operation')}, 'status')
			if status and (status=='Assign' or status not in['Pending', 'Completed']):
				status = 'Completed' if not args.get('quality_check') or args.get('quality_check') == 'No' else 'Under QC'
				status = 'Under Trial' if args.get('trial_no') and cint(args.get('trial_no')) > 0 and status == 'Completed' else status
				update_serial_no_status(production_order, args.get('operation'), data, status, args.get('employee'))
			else:
				if not status:
					frappe.throw(_("Cannnot complete the Serial no {0} without assign").format(data, status))	
				frappe.throw(_("Serial no {0} is already {1}").format(data, status))

	update_manufacturing_process(args, production_order, item_code, work_order, 'Completed')
	if args.get('quality_check') == 'No':
		if not args.get('trial_no') or cint(args.get('trial_no')) == 0:
			update_production_order_status(production_order, args.get('operation'), 'Completed')
			update_po_status(production_order)

		make_stock_entry(args, production_order, qty)

def update_manufacturing_process(args, production_order, item_code, work_order, status):
	name = get_manufacturing_process_name(production_order, args.get('operation'), args.get('employee'))

	args['qc_name'] = ''
	if status == 'Completed' and args.get('quality_check') and args.get('quality_check') != 'No':
		status = "Under Quality Inspection"
		args['qc_name'] = make_qc(production_order, args)

	opts = {
		'employee': args.get('employee'),
		'operation': args.get('operation'),
		'start_date': args.get('start_date'),
		'end_date': args.get('end_date'),
		'completed_serial_no': args.get('completed_serial_no'),
		'hours': args.get('hours'),
		'trial_no': args.get('trial_no'),
		'qc': args.get('quality_check'),
		'item_code': item_code,
		'piece_rate': args.get('piece_rate'),
		'wages': args.get('wages'),
		'style_cost': args.get('style_cost'),
		'total_style_cost': args.get('total_style_cost'),
		'trial_cost': args.get('trial_cost'),
		'extra_cost': args.get('extra_cost'),
		'work_order': work_order,
		'status': status,
		'quality_inspection_no': args.get('qc_name')
	}

	if not name:
		trial_control_no = frappe.db.get_value('Fit Session',
			{'production_order': production_order, 'work_order': work_order}, 'name')
		mp = frappe.get_doc({
			'doctype': 'Manufacturing Process',
			'production_order': production_order,
			'trial_control_no': trial_control_no
		}).insert(ignore_permissions=True)
	else:
		mp = frappe.get_doc('Manufacturing Process', name)

		if args.get('quality_check') and args.get('quality_check') != 'No' and mp.quality_inspection_no and cint(frappe.db.get_value('Quality Inspection', 
				mp.quality_inspection_no, 'docstatus')) == 0:
			throw_ex = True
			if args.get('trial_no') and cint(frappe.db.get_value('Quality Inspection', 
				mp.quality_inspection_no, 'trial_no')) == cint(args.get('trial_no')):
				throw_ex = False

			if throw_ex:
				frappe.throw(_("Serial no {0} is under quality inspection").format(args.get('completed_serial_no')))

		mp.completed_serial_no = args.get('completed_serial_no')

	mp.update(opts)
	mp.save(ignore_permissions=True)

def get_manufacturing_process_name(production_order, operation, employee, args='Name'):
	return frappe.db.get_value('Manufacturing Process', {'production_order': production_order,
		'operation': operation, 'employee': employee}, args)

def update_serial_no_status(production_order, operation, serial_no, status, employee=None):
	if status not in ['Completed', 'Under QC', 'Under Trial']:
		doc = frappe.get_doc('Serial No', serial_no)
		doc.append('serial_no_track', {
			'operation': operation,
			'status': status,
			'production_order': production_order,
			'employee': employee
		})
		doc.save()
	else:
		frappe.db.sql("""update `tabSerial No Track` set status = %s, production_order = %s
			where parent = %s and operation = %s""", (status, production_order, serial_no, operation))

def update_production_order_status(production_order, operation, status):
	if status == 'Completed':
		sn_data = frappe.db.sql(""" select parent from `tabSerial No Track` 
			where production_order = %s and operation = %s and status != 'Completed'""", (production_order, operation), as_dict=1)
		status = 'Work in Progress' if sn_data and len(sn_data[0]) > 0  else 'Completed'
	doc = frappe.get_doc('Production Order', production_order)
	for data in doc.operations:
		if data.operation == operation:
			data.status = status
			data.db_update()

	update_qty = True
	for data in doc.operations:
		if data.status != 'Completed':
			update_qty = False
			break

	if update_qty:
		doc.produced_qty = doc.qty
		doc.db_update()

def update_po_status(production_order):
	po = frappe.get_doc('Production Order', production_order)
	flag = True
	for data in po.operations:
		if data.status != 'Completed':
			flag = False
			break

	status = "Completed" if flag else "In Process"

	if status == 'Completed':
		frappe.db.sql(""" update `tabSerial No` set completed = 1
			where work_order = %s""", po.work_order)

	po.db_set('status', status)

def make_stock_entry(args, production_order, item_code, qty, next_warehouse=None):
	operation = args.get('operation')
	production_order = frappe.get_doc('Production Order', production_order)
	wo = frappe.db.get_value('Fit Session',
                {'production_order': production_order.name}, 'work_order')
	user_warehouse = get_user_warehouse()
	next_warehouse = next_warehouse or get_next_branch(args, production_order, operation, wo)
	if user_warehouse != next_warehouse:
		item = frappe.db.get_value('Job Card Table',
                {'parenttype': 'Production Order', 'parent': production_order.name, 'operation': operation}, 'item_name')
		name = make_out_entry(user_warehouse, next_warehouse, item_code, args.get('completed_serial_no'), qty, wo)
		return name

def get_next_branch(args, po_doc, operation, work_order):
	if args.get('trial_no'):
		name = get_manufacturing_process_name(po_doc.name, operation, args.get('employee'), "trial_control_no")
		return frappe.db.get_value('Fit Session', name, 'warehouse')

	doc = frappe.get_doc('Work Order', work_order)

	index = 1

	if po_doc and operation:
		new_index = get_non_completed_operation(po_doc, operation)
		if new_index and len(doc.operations) >= new_index:
			index = new_index
		else:
			return doc.delivery_warehouse

	branch = doc.operations[index-1].branch
	return frappe.db.get_value('Branch', branch, 'warehouse')

def get_non_completed_operation(po_doc, operation):
#	for d in po_doc.operations:
	for d in po_doc.job_card:
		if d.operation == operation:
			idx = d.idx
			if d.status == 'Completed':
				idx += 1
			return idx

def make_out_entry(user_warehouse, next_warehouse, item_code, serial_no, qty, work_order):
	name = frappe.db.get_value('Stock Entry',
		{'source_warehouse': user_warehouse, 'target_warehouse': next_warehouse, 'docstatus': 0}, 'name')
	if not name:
		ste = frappe.get_doc({
			'doctype': 'Stock Entry',
			'material_purpose': 'Material Out',
			'stock_entry_type': 'Material Out',
			'source_warehouse': user_warehouse,
			'target_warehouse': next_warehouse,
			'purpose': 'Material Issue',
			'branch': get_user_branch(),
			'items': [{
				'item_code': item_code,
				's_warehouse': user_warehouse,
				'source_warehouse': user_warehouse,
				'target_warehouse': next_warehouse,
				'qty': qty,
				'serial_no': serial_no,
				'work_order': work_order
			}]
		}).insert(ignore_permissions=True)
		name = ste.name
	else:
		doc = frappe.get_doc('Stock Entry', name)	
		doc.append('items', {
			'item_code': item_code,
			's_warehouse': user_warehouse,
			'source_warehouse': user_warehouse,
			'target_warehouse': next_warehouse,
			'qty': qty,
			'serial_no': serial_no,
			'work_order': work_order
		})
		doc.save(ignore_permissions=True)
		name = doc.name

	return name

def get_employees(doctype, txt, searchfield, start, page_len, filters):
	filters.update({'name': "%%%s%%"%(txt)})

	return frappe.db.sql("""select `tabEmployee`.name, `tabEmployee`.employee_name
		from `tabEmployee Skill`, `tabEmployee`
		where `tabEmployee Skill`.parent = `tabEmployee`.name and
		`tabEmployee Skill`.operation = %(operation)s and item_code = %(item_code)s
		and (`tabEmployee`.name like %(name)s or `tabEmployee`.employee_name like %(name)s)
		 limit {0}, {1}
	""".format(start, page_len), filters)

def make_qc(production_order, args):
	po = frappe.get_doc("Production Order", production_order)

	qc = frappe.get_doc({
		'doctype': 'Quality Inspection',
		'production_order': production_order,
		'work_order': po.work_order,
		'item_code': po.production_item,
		'item_serial_no': get_trial_serial_no(po.serial_no),
		'operation': args.get('operation'),
		'inspection_type': 'In Process',
		'trial_no': args.get('trial_no'),
		'employee': args.get('employee'),
		'status': 'Pending',
		'inspected_by': frappe.session.user,
		'sample_size': 1
	}).insert(ignore_permissions=True)

	qc.get_item_specification_details()
	qc.save(ignore_permissions=True)
	return qc.name

def get_trial_serial_no(serial_no):
	sn = serial_no.split('\n')

	if len(sn) > 0:
		for data in sn:
			if frappe.db.exists('Serial No', data):
				return data

	return serial_no

def qi_events(doc, method):
	validate_qi(doc)
	serial_no_status_of_qc(doc)
	stock_entry_for_qc(doc)

def validate_qi(doc):
	if doc.docstatus == 1 and doc.status == 'Pending':
		frappe.throw(_("Status must be Accepted or Rejected"))

def serial_no_status_of_qc(doc):
	status = 'Completed'
	if doc.status == 'Rejected':
		status = "Under QC"
	elif doc.trial_no:
		status = 'Under Trial'

	update_serial_no_status(doc.production_order, doc.operation, doc.item_serial_no, status)

def stock_entry_for_qc(doc):
	if doc.status == 'Accepted':
		args = {
			'employee': doc.employee,
			'operation': doc.operation,
			'completed_serial_no': doc.item_serial_no,
			'trial_no': doc.trial_no
		}

		name = frappe.db.get_value('Manufacturing Process', {'quality_inspection_no': doc.name,
			'production_order': doc.production_order}, 'name')

		if name:
			manufacturing_doc = frappe.get_doc('Manufacturing Process', name)
			manufacturing_doc.status = 'Under Trial' if doc.trial_no else 'Completed'
			manufacturing_doc.trial_no = doc.trial_no
			manufacturing_doc.save()

		make_stock_entry(args, doc.production_order, 1)

def qi_cancel_events(doc, method):
	pass

@frappe.whitelist()
def make_purchase_for_subcontract(production_order, operation, company, supplier):
	item_name = frappe.db.get_value('Item', {'item_name': operation}, 'name')
	po = frappe.get_doc({
		'doctype': 'Purchase Order',
		'company': company,
		'supplier': supplier,
		'items': [{
			'item_code': item_name,
			'qty': 1,
			'production_order': production_order,
			'conversion_factor': 1,
			'schedule_date': nowdate(),
			'subcontract_operation': operation
		}]
	})

	po.set_missing_values()
	po.save(ignore_permissions=True)

	return po