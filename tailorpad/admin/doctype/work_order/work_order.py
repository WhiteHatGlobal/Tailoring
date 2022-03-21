# -*- coding: utf-8 -*-
# Copyright (c) 2015, Lagan Jaiswal and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.utils import cstr, cint, flt, getdate, nowdate, nowtime, now
from erpnext.accounts.utils import get_fiscal_year
from frappe import _, throw
from frappe.model.naming import make_autoname
from frappe.model.document import Document
from tailorpad.custom_folder.custom_stock import get_user_branch, get_branch_abbreviation, get_user_warehouse
from tailorpad.custom_folder.custom_selling import make_bin_for_item_and_warehouse
from tailorpad.custom_folder.custom_manufacturing import (get_users_wo_operation, get_latest_operation,
	get_trial_serial_no, make_stock_entry)
import json
#from erpnext.manufacturing.doctype.work_order.work_order import create_job_card
from frappe.utils import flt, get_datetime, getdate, date_diff, cint, nowdate, get_link_to_form, time_diff_in_hours
from frappe.model.naming import make_autoname

class WorkOrder(Document):
	def validate(self):
		fit_session = frappe.db.sql("""select name,work_order,sales_order,production_order from `tabFit Session` where item_code=%s and sales_order=%s""",(self.item_code,self.sales_order),as_dict=1)
		if fit_session:
			for trial in fit_session:
				#if trial.production_order != "None":
				doc = frappe.get_doc("Fit Session",trial.name)
				for x in doc.get("trials"):
					x.trial_status = "Completed"
				if doc.work_order:
					#self.naming_series = (trial.work_order + '/' + ".##")
					self.name = make_autoname(trial.work_order + "/" + ".##")
					rem = self.name
					
					if rem:
						e_remark = rem.encode('utf-8')
						d_remark = e_remark.decode('utf-8')
						if not doc.modified_work_order:
							doc.modified_work_order = ''
						doc.modified_work_order = doc.modified_work_order + d_remark + '\n'
						if doc.production_order:
							po = frappe.get_doc("Production Order",doc.production_order)
							for x in po.get('production_order_table'):
								if doc.work_order == x.work_order:
									x.modified_work_order = doc.modified_work_order
							po.save()
				
					doc.save()
					doc.modified_work_order = rem

		if self.previous_workorder:
			self.name = self.previous_workorder
			frappe.db.sql("""update `tabTrial Detail` set modified_work_order = %s where name = %s and parent = %s""",(self.name,self.trial_control_form,self.trial_control_form_data),as_dict=True)
		self.calculate_extra_style_cost()
	def onload(self):
		if self.product_fields:
			cost = frappe.db.sql("""select sum(cost_to_customer) as cost from `tabWO Product Field` where parent = %s""",self.name,as_dict=True)
			if cost:
				for x in cost:
					self.cost_to_customer = x.cost
					frappe.db.sql("""update `tabWork Order` set cost_to_customer=%s where name=%s""",(x.cost,self.name),as_list=True)
					frappe.db.commit()
		if self.style_fields:
			style_cost = frappe.db.sql("""select sum(cost_to_customer) as cost from `tabWO Style Field` where parent = %s""",self.name,as_dict=True)
			if style_cost:
				for y in style_cost:
					self.total_cost = y.cost
					frappe.db.sql("""update `tabWork Order` set total_cost=%s where name=%s""",(y.cost,self.name),as_list=True)
					frappe.db.commit()
		invalid_rows = []
		for i in self.get("operations"):
				if i.completed_qty == 0 and i.status == "Pending":
					invalid_rows.append(str(i.idx))
				if invalid_rows:
					frappe.db.set(self, 'status', 'Not Started')
					frappe.db.commit()
				else:
					frappe.db.set(self, 'status', 'Completed')
					#self.status = "Completed"
					frappe.db.commit()
		self.set_onload("have_production_order",
			cint(frappe.db.get_single_value('Manufacturing Settings', 'auto_production_order')))

		so_list = frappe.db.sql("""select production_orders from `tabSales Order` where name = %s""",(self.sales_order),as_dict=1)
		if so_list:
			for s in so_list:
				self.production_order = s.production_orders

	def calculate_extra_style_cost(self):
		extra_style = [flt(style_data.cost_to_customer) for style_data in self.style_fields]
		self.extra_style_cost = sum(extra_style)

	def get_measurement_from_wo(self):
		if self.import_measurement_from_work_order:
			self.set('measurement_fields',[])
			measurement_fields = frappe.db.get_values('Measurement Fields', {'parent': self.import_measurement_from_work_order}, '*', as_dict=1)
			for measurement in measurement_fields:
				wo_meaurement = self.append('measurement_fields', {})
				for key, value in measurement.items():
					setattr(wo_meaurement, key, value)
		return True

	def get_style_from_wo(self):
		if self.import_style_from_work_order:
			self.set('style_fields',[])
			style_fields = frappe.db.get_values('WO Style Field', {'parent': self.import_style_from_work_order}, '*', as_dict=1)
			for style in style_fields:
				wo_style = self.append('style_fields', {})
				for key, value in style.items():
					setattr(wo_style, key, value)
		return True

#	def before_submit(self):
#		if (frappe.db.get_single_value('Manufacturing Settings', 'auto_production_order') 
#				and not self.trial_control_form and frappe.db.get_value('Item', self.item_code, 'has_serial_no')):
#			self.make_serial_no()
#			self.update_sales_order()
#			bom_no = self.make_bom()
#			name = self.make_production_order(bom_no)
#			args = self.get_args(name)
#			self.make_stock_in_entry()
#			make_stock_entry(args, name, self.item_qty)
#			if self.trial_date and frappe.db.get_value('BOM Operation',
#				{'parenttype': 'Item', 'parent': self.item_code, 'trials': 1}, 'name'):
#				self.make_trials_control(name)
#		elif cint(frappe.db.get_value('Item', self.item_code, 'has_serial_no')):
#			if (self.order_type == 'Alteration' 
#				or self.item_group == 'Alteration'):
#				self.make_serial_no(completed=1)
#				self.update_sales_order()
#				self.make_stock_in_entry()

	def make_trials_control(self, production_order):
		trial = frappe.get_doc({
				'doctype': 'Fit Session',
				'sales_order': self.sales_order,
				'customer': self.customer,
				'current_trial_no':1,
				'current_trial_date': self.trial_date,
				'customer_name': self.customer_name,
				'trial_serial_no': get_trial_serial_no(self.serial_no),
				'item_code': self.item_code,
				'item_name': self.item_name,
				'production_order': production_order,
				'work_order': self.name,
				'warehouse': get_user_warehouse()
			}).insert(ignore_permissions=True)

		for data in self.operations:
			if data.trials and data.branch_dict:
				branch_data = json.loads(data.branch_dict)
				for i in sorted(branch_data):
					d = branch_data[i]
					if d:
						trial.append('trials', {
							'operation': d.get('operation'),
							'trial_no': d.get('trial'),
							'trial_status': 'Pending',
							'start_time': self.trial_date,
							'target_warehouse': get_user_warehouse(data.branch)
						})
		trial.save(ignore_permissions=True)

	def get_args(self, production_order):
		branch_operations = get_users_wo_operation(production_order, self.item_code)
		operation = get_latest_operation(branch_operations, production_order)	
		return {
			'operation': operation,
			'completed_serial_no': self.serial_no
		}

	def on_submit(self):
		if self.sales_order:
			status = frappe.db.get_value('Sales Order', self.sales_order, 'docstatus')
			if status == 0:
				frappe.throw("Warning: Sales Order {0} Not Yet Submitted".format(self.sales_order))
		if self.bom_no:
			bom = frappe.get_doc("BOM",self.bom_no)
			bom.submit()
		if not self.trial_control_form and self.customer:
			self.update_customer_measurements()

		frappe.db.set(self, 'status', 'Submitted')
		# self.update_trial_control_form()
		self.update_trial_details()
		###custom code for creating One Production Order from mulitple WO for one Sales Order
		if self.name:
			name = self.name
			curr_name = name.split('/')
			if len(curr_name) == 1:
				self.make_production()
				self.make_purchase_order()
		#self.purchase_order()

		for d in self.items:
			if d.item_code == self.fabric_code and d.warehouse != self.fabric_warehouse:
				self.fabric_warehouse = d.warehouse

		if self.fabric_code:
			warehouse = self.fabric_warehouse or frappe.db.get_value('Item', self.fabric_code, 'default_warehouse')
			if warehouse:
				make_bin_for_item_and_warehouse(self.fabric_code, warehouse, self.fabric_qty, add_qty=False)
		#for index, row in enumerate(self.operations):
		#	create_job_card(self,row,auto_create=True)

		#if self.production_order:
		#	frappe.db.sql("""update `tabProduction Order Table` set wo_submitted = %s, work_order = %s where parent = %s and production_item = %s""",('1',self.name,self.production_order,self.item_code))

		#	wo_op = frappe.db.sql("""select operation,status, employee, employees, workstation, is_subcontracted from `tabBOM Operation` where parent = %s""",(self.name),as_dict=1)
			
		#	pdn = frappe.get_doc("Production Order",self.production_order)
		#	for k in wo_op:
		#		#if not self.job_card:
		#		child = pdn.append('job_card',{})
		#		child.operation = k.operation
		#		child.is_subcontracted = k.is_subcontracted
		#		if k.operation == 'Cutting':
		#			child.order_wise = '1'
		#		elif k.operation == 'Stitching':
		#			child.order_wise = '2'
		#		elif k.operation == 'Finishing':
		#			child.order_wise = '3'
		#		child.item_name = self.item_code
		#		child.qty = self.item_qty
		#		child.fabric_code = self.fabric_code
		#		child.assigned_qty = self.item_qty
		#		child.balance_qty = self.item_qty
		#		child.workstation = k.workstation
		#		child.status = k.status
		#	pdn.save()
			
	###custom code for creating One Production Order from mulitple WO for one Sales Order
	def make_production(self):
		if self.sales_order:
			#frappe.msgprint('SOOOO')
			manf_item = frappe.db.get_value("Item",self.item_code,"include_item_in_manufacturing")
			if manf_item == 1:
				#frappe.msgprint('manf '+str(manf_item))
				pro_list = frappe.db.sql("""select parent from `tabProduction Order Table` where sales_order = %s""",(self.sales_order),as_dict=1)
				#frappe.msgprint('PRO '+str(pro_list))
				if pro_list:
					for i in pro_list:
						if i.parent:
							#frappe.msgprint('if')
							po = frappe.get_doc('Production Order',i.parent)
							po.production_item = self.item_code
							po.item_name = self.item_name
							po.customer = self.customer
							po.customer_name = self.customer_name
							po.serial_no = self.serial_no
							po.sales_order = self.sales_order
							po.append('production_order_table',{
	               				"production_item": self.item_code,
	                			"bom_no": self.bom_no,
	                			"qty": self.item_qty,
								"sales_order" : self.sales_order,
								"work_order": self.name,
								"wo_submitted": '1',

							})

							#for j in self.get('required_items'):
							#	po.append('required_items', {
							#		"item_code": j.item_code,
							#		"source_warehouse": j.source_warehouse,
							#		"item_name": j.item_name,
							#		"description": j.description,
							#		"required_qty": j.required_qty,
							#		"transferred_qty": j.transferred_qty,
							#		"available_qty_at_source_warehouse": j.available_qty_at_source_warehouse,
							#		"available_qty_at_wip_warehouse": j.available_qty_at_wip_warehouse
							
							#	})
							#for j in self.get('operations'):
							#	po.append('job_card_table',{
							#		"operation": j.operation,
							#		"workstation": j.workstation,
							#		"is_subcontracted": j.is_subcontracted,
							#		"item_name": self.item_code,
							#		"qty": self.item_qty,
							#		"fabric_code": self.fabric_code,
							#		"status": j.status

							#})
					
							po.save(ignore_permissions = True)
							ignore_permissions = False
							#frappe.db.sql("""update `tabWork Order` set production_order = %s where name = %s""",(po.name,self.name))
							self.production_order = po.name
							self.save()
					#frappe.throw('in')
				else:
						#frappe.msgprint('else')
						po = frappe.new_doc('Production Order')
						po.production_item = self.item_code
						po.item_name = self.item_name
						po.customer = self.customer
						po.customer_name = self.customer_name
						po.serial_no = self.serial_no
						po.wip_warehouse = get_user_warehouse()
						po.fg_warehouse = get_user_warehouse()
						po.sales_order = self.sales_order
						po.append('production_order_table',{
								"production_item": self.item_code,
								"bom_no": self.bom_no,
								"qty": self.item_qty,
								"sales_order" : self.sales_order,
								"wo_submitted": '1',
						})

						#for j in self.get('operations'):
						#	po.append('job_card_table',{
						#			"operation": j.operation,
						#			"workstation": j.workstation,
						#			"is_subcontracted": j.is_subcontracted,
						#			"item_name": self.item_code,
						#			"qty": self.item_qty,
						#			"fabric_code": self.fabric_code,
						#			"status": j.status
						#	})

						po.save(ignore_permissions = True)
						ignore_permissions = False
						#frappe.db.sql("""update `tabWork Order` set production_order = %s where name = %s""",(po.name,self.name))
						self.production_order = po.name
						self.save()

	def make_purchase_order(self):
		for i in self.operations:
			if i.is_subcontracted == 1:
				new_po = frappe.new_doc('Purchase Order')
				new_po.supplier = frappe.db.get_value('Item', {'item_name': i.operation}, 'default_supplier')
				new_po.schedule_date = nowdate()
				po_itm = new_po.append('items', {})

				po_itm.item_code = frappe.db.get_value('Item', {'item_name': i.operation}, 'name')
				po_itm.item_name = i.operation
				po_itm.description = i.operation
				po_itm.uom = frappe.db.get_value('Item', {'item_name': i.operation}, 'stock_uom')
				po_itm.item_group = frappe.db.get_value('Item', {'item_name': i.operation}, 'item_group')
				po_itm.qty = self.item_qty
				po_itm.schedule_date = nowdate()
				po_itm.work_order = self.name
				po_itm.sales_order = self.sales_order
							
				new_po.insert()
			
				frappe.db.sql("""update `tabJob Card Table` set purchase_order = %s where parent = %s and operation = %s and is_subcontracted = %s""",(new_po.name,self.production_order,i.operation,'1'))

		for d in self.items:
			if d.make_po:
				self.validate_supplier(d)
			
				po = frappe.db.get_value('Purchase Order',
					{'supplier': d.supplier, 'docstatus': 0}, 'name')

				args = {
					'item_code': d.item_code,
					'qty': d.qty,
					'schedule_date': nowdate(),
					'work_order': self.name,
					'sales_order': self.sales_order
				}

				if po:
					po_doc = frappe.get_doc('Purchase Order', po)
				else:
					po_doc = frappe.new_doc('Purchase Order')
					po_doc.supplier = d.supplier
					po_doc.schedule_date = nowdate()

				po_doc.append('items', args)
				po_doc.set_missing_values()
				po_doc.save()
				frappe.msgprint(_("Purchase order {0} created").format(po_doc.name))
#def purchase_order(self):
##On submit sales order to create purchase order depends on supplier with fabric item 
		raw_item = frappe.db.sql("""select distinct supplier from `tabBOM Item` where parent = %s""",self.name,as_dict=True)
		for i in raw_item:
			it = frappe.db.sql("""select item_code,qty,item_name,description,uom,stock_uom,supplier from `tabBOM Item` where parent = %s and supplier = %s""",(self.name,i.supplier),as_dict=True)
			purchase_order = frappe.new_doc("Purchase Order")
			for x in it:
				purchase_order.supplier = x.supplier

				it_table = purchase_order.append('items', {})
				it_table.item_code = x.item_code
				it_table.qty = x.qty
				it_table.schedule_date = self.delivery_date
				it_table.item_name = x.item_name
				it_table.description = x.description
				it_table.uom = x.uom
				it_table.stock_uom = x.stock_uom
				it_table.warehouse = frappe.db.get_single_value("Stock Settings", "default_warehouse")

			purchase_order.save()
	def validate_supplier(self, item):
		if not item.supplier:
			frappe.throw(_("Row {0}: Select supplier for raw material item {1}").format(item.idx, item.item_code))

	def update_trial_details(self):
		trial_no = ''
		add_new_trial = True
		operation = ''
		target_warehouse = ''
		if self.trial_control_form and self.trial_control_form_data:
			trial_doc = frappe.get_doc('Fit Session', self.trial_control_form_data)
			for data in trial_doc.trials:
				if data.name == self.trial_control_form:
					trial_no = data.trial_no
					operation = data.operation
					target_warehouse = data.target_warehouse					
					data.trial_status = 'Closed'
					data.modified_work_order = self.name
					break

			if trial_no:
				for t in trial_doc.trials:
					if cint(t.trial_no) > cint(trial_no):
						t.trial_status = 'Open'
						add_new_trial = False
						break

			if add_new_trial and trial_no:
				trial_no = cint(trial_no) + 1
				trial_doc.append('trials', {
					'operation': operation,
					'target_warehouse': target_warehouse,
					'trial_no': trial_no,
					'trial_status': 'Open',
					'start_time': now()
				})

			trial_doc.save()
			if trial_no:
				trial_doc.transfer_material(trial_no)

			po = frappe.db.get_value('Production Order', {'work_order': self.modified_work_order}, 'name')
			if po:
				po_doc = frappe.get_doc('Production Order', po)
				row = po_doc.append('updated_work_orders', {
					'work_order': self.name
				})
				row.db_update()

				mp = frappe.db.get_value('Manufacturing Process', {'production_order': po,
					'operation': operation, 'completed_serial_no': self.serial_no}, 'name')
				if mp:
					mp_doc = frappe.get_doc('Manufacturing Process', mp)
					mp_doc.trial_no = trial_no
					mp_doc.save()

	def update_trial_control_form(self):
		if self.trial_control_form:
			frappe.db.sql(""" update `tabTrial Detail` set modified_work_order = %s
				where name = %s""", (self.name, self.trial_control_form))

			frappe.db.sql(""" update `tabProduction Order` set modified_work_order = %s
				where work_order = %s""", (self.name, self.modified_work_order))

	def update_customer_measurements(self):
		measurement_template = frappe.db.get_value("Item", self.item_code, 'measurement_template')
		customer_doc = frappe.get_doc('Customer', self.customer)
		measurement_field = [data.measurement_field for data in customer_doc.customer_measurement_data if data.measurement_template == measurement_template]
		for d in self.measurement_fields:
			if d.measurement_field not in measurement_field:
				customer_doc.append('customer_measurement_data', {'measurement_template': measurement_template,
										'measurement_field': d.measurement_field, 'measurement_value': d.measurement_value,
										'note': d.note, 'image': d.image, 'image_html': d.image_html})
			elif d.update_value_in_customer_template:
				for data in customer_doc.customer_measurement_data:
					if data.measurement_field == d.measurement_field:
						data.measurement_value = d.measurement_value

		for e in self.measurement_fields:
			if e.update_value_in_customer_template and e.measurement_template and e.measurement_value:
				for data in customer_doc.customer_measurement_data:
					if (data.measurement_field == e.measurement_field 
						and data.measurement_template == e.measurement_template):
						data.measurement_value = e.measurement_value

		customer_doc.save()

	def make_serial_no(self, completed=0):
		if self.serial_no and self.order_type in ['RTB/Alteration', 'RTB']:
			return

		abbr = get_branch_abbreviation() or frappe.db.get_value('Sales Order', self.sales_order, 'naming_series')
		transaction_date = getdate(frappe.db.get_value('Sales Order', self.sales_order, 'transaction_date'))
		month = transaction_date.strftime("%b")
		year = transaction_date.year

		naming_series = self.sales_order + '/.##' if self.sales_order else None
		if not naming_series:
			naming_series = self.item_code if self.serial_no_based_on == 'Item Code' else self.serial_no_series

			if not naming_series:
				frappe.throw(_("Select naming series"))

			naming_series = naming_series + '/.##'

		for r in range(cint(self.item_qty)):
			sn = frappe.new_doc('Serial No')
			sn.serial_no = make_autoname(naming_series)
			sn.item_code = self.item_code
			sn.work_order = self.name
			sn.sales_order = self.sales_order
			sn.customer = self.customer
			sn.customer_name = self.customer_name
			sn.month = month
			sn.year = year
			sn.company = self.company
			sn.completed = completed
			sn.save(ignore_permissions=True)
			if self.serial_no:
				self.serial_no += '\n' + sn.name
			else:
				self.serial_no = sn.name

	def update_sales_order(self):
		if self.sales_order_idx:
			frappe.db.sql("""update `tabSales Order Item` set serial_no = %s where idx=%s
				and parent = %s""", (self.serial_no, self.sales_order_idx, self.sales_order))

	def make_bom(self):
		if self.operations and self.items:
			bom = frappe.new_doc('BOM')
			bom.item = self.item_code
			bom.with_operations = 1
			bom.company = self.company
			bom.item_name = self.item_name
			self.set_operations(bom)
			self.set_items(bom)
			bom.insert(ignore_permissions = True)
			bom.submit()
			return bom.name
		else:
			return None

	def set_operations(self, bom):
		for d in self.operations:
			bom.append('operations', {
				'operation': d.operation,
				'description': d.description,
				'hour_rate': d.hour_rate,
				'time_in_mins': d.time_in_mins or 10.0,
				'branch': d.branch,
				'trials': d.trials,
				'branch_dict': d.branch_dict,
				'quality_check': d.quality_check
			})

	def set_items(self, bom):
		for d in self.items:
			bom.append('items', {
				'item_code': d.item_code,
				'item_name': d.item_name,
				'description': d.description,
				'stock_uom': d.stock_uom,
				'uom': d.uom,
				'qty': d.qty
			})

	def make_production_order(self, bom_no):
		bom_no = bom_no or frappe.db.get_value("BOM", filters={"item": self.item_code, "is_default": 1})
		if bom_no:
			po = frappe.get_doc({
				'doctype': 'Production Order',
				'production_item': self.item_code,
				'item_name': self.item_name,
				'sales_order': self.sales_order,
				'bom_no': bom_no,
				'qty': self.item_qty,
				'serial_no': self.serial_no,
				'wip_warehouse': get_user_warehouse(),
				'fg_warehouse': get_user_warehouse(),
				'work_order': self.name,
				'customer': self.customer,
				'customer_name': self.customer_name,
				'sales_order_no': self.sales_order
			}).insert(ignore_permissions = True)
			po.set_production_order_operations()
			po.submit()
			return po.name

	def make_stock_in_entry(self):
		valuation_rate = 0
		if self.serial_no:
			from erpnext.stock.stock_ledger import get_previous_sle

			warehouse = get_user_warehouse()
			previous_sle = get_previous_sle({
				"item_code": self.item_code,
				"warehouse": warehouse,
				"posting_date": nowdate(),
				"posting_time": nowtime()
			})

			qty = self.item_qty
			if previous_sle:
				if self.item_qty in ("", None):
					qty = previous_sle.get("qty_after_transaction", 0) + flt(self.item_qty)

				valuation_rate = previous_sle.get("valuation_rate", 0)

			if not valuation_rate:
				valuation_rate = frappe.db.get_value('Item', self.item_code, 'valuation_rate')

			args = frappe._dict({
				"doctype": "Stock Ledger Entry",
				"item_code": self.item_code,
				"warehouse": warehouse,
				"posting_date": nowdate(),
				"posting_time": nowtime(),
				"voucher_type": self.doctype,
				"voucher_no": self.name,
				"company": self.company,
				"stock_uom": frappe.db.get_value("Item", self.item_code, "stock_uom"),
				"is_cancelled": "No",
				"actual_qty": qty,
				"serial_no": self.serial_no,
				"valuation_rate": valuation_rate
			})

			from erpnext.stock.stock_ledger import make_sl_entries
			make_sl_entries([args], None, False, False)

			# ste = frappe.get_doc({
			# 	'doctype': 'Stock Entry',
			# 	'material_purpose': 'Material In',
			# 	'purpose': 'Material Receipt',
			# 	'items': [{
			# 		'item_code': self.item_code,
			# 		'qty': self.item_qty,
			# 		't_warehouse': get_user_warehouse(),
			# 		'serial_no': self.serial_no
			# 	}]
			# }).insert(ignore_permissions=True)

			# ste.get_stock_and_rate()
			# ste.submit()
	def update_operation_status(self):
		allowance_percentage = flt(frappe.db.get_single_value("Manufacturing Settings", "overproduction_percentage_for_work_order"))
		max_allowed_qty_for_wo = flt(self.qty) + (allowance_percentage/100 * flt(self.qty))

		for d in self.get("operations"):
			if not d.completed_qty:
				d.status = "Pending"
			elif flt(d.completed_qty) < flt(self.item_qty):
				d.status = "Work in Progress"
			elif flt(d.completed_qty) == flt(self.item_qty):
				d.status = "Completed"
			elif flt(d.completed_qty) <= max_allowed_qty_for_wo:
				d.status = "Completed"
			else:
				frappe.throw(_("Completed Qty cannot be greater than 'Qty to Manufacture'"))
	def calculate_operating_cost(self):
		self.planned_operating_cost, self.actual_operating_cost = 0.0, 0.0
		for d in self.get("operations"):
			d.planned_operating_cost = flt(d.hour_rate) * (flt(d.time_in_mins) / 60.0)
			d.actual_operating_cost = flt(d.hour_rate) * (flt(d.actual_operation_time) / 60.0)

			self.planned_operating_cost += flt(d.planned_operating_cost)
			self.actual_operating_cost += flt(d.actual_operating_cost)

		variable_cost = self.actual_operating_cost if self.actual_operating_cost \
			else self.planned_operating_cost

		self.total_operating_cost = (flt(self.additional_operating_cost)
			+ flt(variable_cost) + flt(self.corrective_operation_cost))
	def set_actual_dates(self):
		if self.get("operations"):
			actual_start_dates = [d.actual_start_time for d in self.get("operations") if d.actual_start_time]
			if actual_start_dates:
				self.actual_start_date = min(actual_start_dates)

			actual_end_dates = [d.actual_end_time for d in self.get("operations") if d.actual_end_time]
			if actual_end_dates:
				self.actual_end_date = max(actual_end_dates)
		else:
			data = frappe.get_all("Stock Entry",
				fields = ["timestamp(posting_date, posting_time) as posting_datetime"],
				filters = {
					"work_order": self.name,
					"purpose": ("in", ["Material Transfer for Manufacture", "Manufacture"])
				}
			)

			if data and len(data):
				dates = [d.posting_datetime for d in data]
				self.db_set('actual_start_date', min(dates))

				if self.status == "Completed":
					self.db_set('actual_end_date', max(dates))

		self.set_lead_time()

	def set_lead_time(self):
		if self.actual_start_date and self.actual_end_date:
			self.lead_time = flt(time_diff_in_hours(self.actual_end_date, self.actual_start_date) * 60)


	def before_cancel(self):
		frappe.db.sql(""" update `tabUpdated Work Order` set work_order = null
			where work_order = %s""", self.name)

		frappe.db.sql(""" update `tabTrial Detail` set modified_work_order = null
			where modified_work_order = %s""", self.name)

	def on_cancel(self):
		self.serial_no = None
		self.update_sales_order()
		frappe.db.sql(""" delete from `tabStock Ledger Entry` where voucher_no = %s""", self.name)

		if frappe.db.get_single_value('Manufacturing Settings', 'auto_production_order'):
			for d in frappe.get_all('Serial No', fields = ["name"], filters = {'work_order': self.name}):
				frappe.db.sql("delete from `tabSerial No` where name = %s", d.name)
		frappe.db.set(self, 'status', 'Cancelled')

		if self.fabric_code:
			warehouse = self.fabric_warehouse or frappe.db.get_value('Item', self.fabric_code, 'default_warehouse')
			if warehouse:
				make_bin_for_item_and_warehouse(self.fabric_code, warehouse, self.fabric_qty)
@frappe.whitelist()
def work_orderlink(doctype, txt, searchfield, start, page_len, filters):
	return frappe.db.sql(""" select name, fabric_name, date_format(modified, '%(format)s') from `tabWork Order`
		where (name like '%%%(txt)s%%' or measured_by like '%%%(txt)s%%') and name <> '%(work_order)s' and customer = '%(customer)s'
		and item_code="%(item_code)s" and docstatus = 1
		limit %(start)s, %(page_len)s"""%{'format':'%d-%b-%Y %h:%i %p', 'txt': txt, 'start': start, 'page_len': page_len, 'work_order': filters.get('work_order'),
		'customer': filters.get('customer'), 'item_code': filters.get('item_code')})
@frappe.whitelist()
def get_style_name(doctype, txt, searchfield, start, page_len, filters):
	sf = filters.get('style_field')
	s = filters.get('style_template') or filters.get('new_style_template')
	it = frappe.db.sql("""select style_template from `tabItem` where name = %s""",s,as_dict=True)
	for x in it:
		return frappe.get_all('Style fields', fields=["style_option"], 
                filters={'style_field':sf,'parent': ('in', x.style_template)}, as_list=1)

@frappe.whitelist()
def get_product_name(doctype, txt, searchfield, start, page_len, filters):
	sf = filters.get('product_field')
	s = filters.get('product_option')
	it = frappe.db.sql("""select product_option from `tabItem` where name = %s""",s,as_dict=True)
	for x in it:
		return frappe.get_all('Product Fields', fields=["product_option"], 
                filters={'product_field':sf,'parent': ('in', x.product_option)}, as_list=1)

@frappe.whitelist()
def get_style_data(args, style_field):
	args = json.loads(args)
	style_data = {}
	default_style = get_default_style(args)
	parent, parenttype = args.get('item_code'), 'Item'
	temp = args.get('style_template')
	item = frappe.get_doc("Item",temp)
	if args.get('doctype') in ['Customer', 'Sales Form', 'Customer Style','Work Order']:
		template = item.get('style_template') or item.get('new_style_template')
		parent, parenttype = template, 'Style Template'
	a = frappe.db.get_values('Style fields',\
	 {'parent': parent, 'style_field': style_field}, '*', order_by='idx', as_dict=1, debug=1)
	for s in frappe.db.get_values('Style fields',\
	 {'parent': parent, 'style_field': style_field}, '*', order_by='idx', as_dict=1, debug=1):
		style_data, s = previous_operation(style_data, s, default_style)
		style_data[s.style_field].append(s)
	return style_data


def get_default_style(args):
	style_data  = {}
	table = 'style_fields' if args.get('doctype') == 'Work Order' else 'styles'
	for d in args.get(table):
		style_data[d.get('style_field')] = [d.get('style_name'), d.get('cost_to_customer')]
	return style_data

def previous_operation(style_data, s, default_style):
	s['is_checked'] = ''
	if s.style_field not in style_data: style_data.setdefault(s.style_field, [])
	if s.style_name == default_style[s.style_field][0]:
		s['is_checked'] = 'checked'
		s['cost_to_customer'] = default_style[s.style_field][1]
	return style_data, s


@frappe.whitelist()
def get_style_name_data(item_code, style_field, style_name):
	data = frappe.db.get_values('Style fields',\
	 {'parent': item_code, 'parenttype': 'Item', 'style_field': style_field, 'style_name': style_name}, '*', order_by='idx', as_dict=1)
	return data[0] if data else None

@frappe.whitelist()
def get_product_name_data(item_code, product_field, product_name):
	data = frappe.db.get_values('Product Fields',\
	 {'parent': item_code, 'parenttype': 'Item', 'product_field': product_field, 'product_name': product_name}, '*', order_by='idx', as_dict=1)
	return data[0] if data else None

@frappe.whitelist()
def get_style_name_data_for_customer(style_template, style_field, style_name):
	data = frappe.db.get_values('Style fields',\
	 {'parent': style_template, 'parenttype': 'Style Template', 'style_field': style_field, 'style_name': style_name}, '*', order_by='idx', as_dict=1)
	return data[0] if data else None
