# -*- coding: utf-8 -*-
# Copyright (c) 2015, Lagan Jaiswal and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.utils import cint
from tailorpad.custom_folder.custom_manufacturing import make_stock_entry
from frappe.model.document import Document

class FitSession(Document):
	def onload(self):
		so = frappe.db.sql("""select trial_date from `tabSales Order` where name = %s""",self.sales_order,as_dict=1)
		for fit in so:
			self.trial_date = fit.trial_date
		po = frappe.db.sql("""select production_order,name from `tabWork Order` where sales_order = %s and item_code = %s and name = %s""",(self.sales_order,self.item_code,self.work_order),as_dict=True)
		if po:
			for po_name in po:
				self.production_order = po_name.production_order
				self.work_order = po_name.name
				frappe.db.commit()
		for x in self.trials:
			x.trial_no = x.idx
		operation = frappe.db.sql("""select operation,completed from `tabJob Card Table` where parent = %s and work_order = %s""",(self.production_order,self.work_order),as_dict=True)
		if operation:
			for op in operation:
				for trial in self.get("trials"):
					if trial.operation == op.operation:
						if op.completed==1:
							trial.po_complete = "Yes"
						else:
							trial.po_complete = "No"
					if trial.po_complete == "No":
						self.po_operation = "No"
					else:
						self.po_operation = "Yes"
				trial.save()
		else:
			self.po_operation = "No"

	def validate(self):
		trial_no = ''
		trial_date = ''
		for data in self.trials:
			if data.trial_status == 'Open':
				trial_no = data.trial_no
				trial_date = data.start_time
				break
			if data.trial_status == 'Pending' and data.fitting_date and not data.appointment and data.new_row:
				apt = frappe.new_doc("Appointment")
				apt.scheduled_time = data.fitting_date
				apt.customer_name = self.customer_name
				apt.customer_email = frappe.db.get_value('Customer', self.customer, 'email')
				apt.delivery_time = self.delivery_date
				apt.save(ignore_permissions=True)
				apt.flags.ignore_mandatory = True
				data.appointment = "1"
				data.appointment_no = apt.name
		self.current_trial_no = trial_no
		self.current_trial_date = trial_date
		if self.status == "Open":
			invalid_rows = []
			for i in self.get("trials"):
				if i.trial_status != "Closed":
					invalid_rows.append(str(i.idx))
				if invalid_rows:
					self.status = "Open"
				else:
					self.status = "Closed"
	@frappe.whitelist()
	def transfer_material(self, idx):
		trial_no = idx
		for data in self.trials:
			if cint(data.trial_no) == cint(trial_no):
				args = self.get_args(data.operation)
				ste = make_stock_entry(args, self.production_order, self.item_code, 1, data.target_warehouse)
				data.stock_entry = ste
				data.db_update()

	def get_args(self, operation):
		return {
			'operation': operation,
			'completed_serial_no': self.trial_serial_no,
		}
	@frappe.whitelist()
	def closed_all_trials(self):
		if self.status == 'Open':
			operation = self.get_last_closed_operation()
			args = self.get_args(operation)
			#make_stock_entry(args, self.production_order, self.item_code, 1)
			self.status = 'Closed'
			self.post_all_closed_trials(operation)
			self.save()
	@frappe.whitelist()
	def add_trials(self,idx):
		operation = ''
		idx = ''
		trial = frappe.db.sql("""select operation,idx from `tabTrial Detail` where parent = %s order by idx""",self.name,as_dict=True)
		l = len(trial) - 1
		operation = (trial[l]['operation'])
		idx = (trial[l]['idx']) + 1
		if operation:
			for op in self.get('trials'):
				if not op.operation:
					op.operation = operation
				if not op.trial_no:
					op.trial_no = idx
					idx = op.trial_no
					op.fitting_date = self.trial_date
					op.new_row = "1"					

	def post_all_closed_trials(self, operation):
		frappe.db.sql("""update `tabSerial No Track` set status = %s, production_order = %s
			where parent = %s and operation = %s""", ('Completed', self.production_order, self.trial_serial_no, operation))

		mp = frappe.db.get_value('Manufacturing Process', {'production_order': self.production_order,
					'operation': operation, 'completed_serial_no': self.trial_serial_no}, 'name')
		if mp:
			mp_doc = frappe.get_doc('Manufacturing Process', mp)
			mp_doc.trial_no = ""
			mp_doc.status = "Completed"
			mp_doc.save()

		for d in self.trials:
			d.trial_status = "Closed"

	def get_last_closed_operation(self):
		operation = ''
		for data in self.trials:
			return data.operation

@frappe.whitelist()
def make_work_order(source_name, trial_name):
	doc = frappe.get_doc('Fit Session', source_name)
	wo = frappe.get_doc('Work Order', doc.work_order)
 #wo.docstatus = 0
	wo.trial_control_form = trial_name
	wo.trial_control_form_data = source_name
	wo.modified_work_order = doc.work_order

	modified_wo = frappe.db.get_value('Fit Session', doc.name, 'modified_work_order')
	if modified_wo:
		split_wo = modified_wo.split('\n')
		l = len(split_wo) - 2
		m1 = split_wo[l]
		m = frappe.get_doc('Work Order', split_wo[l])
		new_wo = frappe.copy_doc(m)
	else:
		new_wo = frappe.copy_doc(wo)
	from frappe.model.naming import make_autoname
 #name = make_autoname(wo.name + '/' + ".##")
 #new_wo.previous_workorder = name
 #rem = name
 #if rem:
 #  e_remark = rem.encode('utf-8')
 #  d_remark = e_remark.decode('utf-8')
 #  if not doc.modified_work_order:
 #   doc.modified_work_order = ''
 #  doc.modified_work_order = doc.modified_work_order + d_remark + '\n'
 #  po = frappe.get_doc("Production Order",doc.production_order)
 #  for x in po.get('production_order_table'):
 #   if doc.work_order == x.work_order:
 #    x.modified_work_order = doc.modified_work_order
 #  po.save()
 #  doc.save()
 #doc.modified_work_order = name
	return new_wo
