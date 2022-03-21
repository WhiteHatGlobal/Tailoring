# -*- coding: utf-8 -*-
# Copyright (c) 2018, Lagan Jaiswal and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from frappe.utils import cint
from erpnext.selling.doctype.sales_order.sales_order import make_delivery_note, make_sales_invoice

from frappe.model.document import Document

class SalesForm(Document):
	def update_photo(self):
		self.validate_customer()

		images = {}
		for field in ['attach_front_side', 'attach_back_side', 'side_view']:
			if self.get(field):
				images.setdefault(field, self.get(field))

		if images:
			doc = frappe.get_doc('Customer', self.customer)
			doc.update(images)
			doc.save(ignore_permissions=True)
			frappe.msgprint("Photo uploaded successfully")

	def update_measurement(self):
		self.validate_customer()
		update_measurement_data(self)

	def update_style(self):
		self.validate_customer()
		update_style_data(self)

	def validate_customer(self):
		if not self.customer:
			frappe.throw(_("Select customer"))

	def submit_sales_order(self):
		so = frappe.new_doc('Sales Order')
		for d in ['customer', 'transaction_date', 'currency', 'selling_price_list',
			'apply_discount_on', 'additional_discount_percentage', 'discount_amount', 'mode_of_payment',
			'advance_amount', 'taxes_and_charges']:
			so.set(d, self.get(d))

		so.advance_payment_amount = self.advance_amount
		so.set('items', self.items)
		so.set('taxes', self.taxes)
		if self.mode_of_payment == 'Stripe':
			so.on_submit_make_payment_request = 1

		so.save()
		so.submit()
		self.sales_order_link = so.name
		self.sales_order = '<a target="_blank" href="#Form/Sales Order/{0}">{0}</a>'.format(so.name)
		frappe.msgprint("Sales order {0} created successfully".format(so.name))

		for d in frappe.get_all("Work Order", 
			fields = ["*"], filters= {'sales_order': so.name}):
			self.append('sales_work_order', {
				'work_order': d.name,
				'item_code': d.item_code,
				'item_name': d.item_name,
				'fabric_code': d.fabric_code,
				'fabric_name': d.fabric_name,
				'tailoring_supplier': d.tailoring_supplier,
				'fabric_supplier_name': d.fabric_supplier
			})

	def submit_sales_invoice(self):
		if frappe.db.get_value('Work Order', filters = {'sales_order': self.sales_order_link, 'docstatus': 0}):
			frappe.throw("Submit the work order against the sales order {0} first".format(self.sales_order_link))

		si = make_sales_invoice(self.sales_order_link)
		si.insert()
		si.submit()
		self.sales_invoice = '<a target="_blank" href="#Form/Sales Invoice/{0}">{0}</a>'.format(si.name)
		frappe.msgprint("Sales invoice {0} created successfully".format(si.name))

def update_measurement_data(doc):
	customer_doc = frappe.get_doc('Customer', doc.customer)
	if doc.type_of_measurement == "New" and doc.new_measurement_template:
		for v in doc.measurement_fields_1:
			mfs = customer_doc.append("customer_measurement_data", {})
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
		for f in doc.measurement_fields_1:
			m_fields[f.measurement_field] = [f.measurement_value, f.image_html, f.note, f.image]

		for h in customer_doc.customer_measurement_data:
			if h.measurement_template == doc.measurement_template and h.measurement_field in m_fields:
				h.measurement_value = m_fields[h.measurement_field][0]
				h.image_html = m_fields[h.measurement_field][1]
				h.note = m_fields[h.measurement_field][2]
				updated_mt.append(h.name)
				del m_fields[h.measurement_field]

		if m_fields:
			for key, val in m_fields.items():
				mfs = customer_doc.append("customer_measurement_data", {})
				mfs.measurement_template = doc.measurement_template
				mfs.measurement_field = key
				mfs.note = val[2]
				mfs.measurement_value = val[0]
				mfs.image = val[3]
				mfs.image_html = val[1]

		if len(updated_mt) > 0:
			frappe.db.sql(""" delete from `tabCustomer Measurement Data`
				where parent = '%s' and measurement_template = '%s' and name not in (%s)
				"""%(customer_doc.name, doc.measurement_template, ','.join(['%s'] * len(updated_mt))), tuple(updated_mt))

	customer_doc.flags.ignore_mandatory = True
	customer_doc.save()
	frappe.msgprint("Measurement updated sucessfully")

def update_style_data(doc):
	customer_doc = frappe.get_doc('Customer', doc.customer)
	if doc.type_of_style == "New" and doc.new_style_template:
		for v in doc.styles:
			mfs = customer_doc.append("customer_style_data", {})
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
			m_fields[v.style_field] = [v.style_name, v.html_image, v.note, v.style_field, v.image, v.cost_to_customer]

		for h in customer_doc.customer_style_data:
			if h.style_template == doc.style_template and h.style_field in m_fields:
				frappe.errprint([m_fields[h.style_field][2], m_fields[h.style_field][5]])
				h.style_value = m_fields[h.style_field][0]
				h.image_html = m_fields[h.style_field][1]
				h.image = m_fields[h.style_field][4]
				h.note = m_fields[h.style_field][2]
				h.cost_to_customer = m_fields[h.style_field][5]

				updated_mt.append(h.name)
				del m_fields[h.style_field]

		if m_fields:
			for key, val in m_fields.items():
				mfs = customer_doc.append("customer_style_data", {})
				mfs.style_template = doc.style_template
				mfs.style_field = key
				mfs.note = val[2]
				mfs.style_value = val[0]
				mfs.image = val[4]
				mfs.image_html = val[1]
				mfs.flags.ignore_mandatory = True
				mfs.save()

		if len(updated_mt) > 0:
			frappe.db.sql(""" delete from `tabCustomer Style Data`
				where parent = '%s' and style_template = '%s' and name not in (%s)
				"""%(customer_doc.name, doc.style_template, ','.join(['%s'] * len(updated_mt))), tuple(updated_mt))


	customer_doc.flags.ignore_mandatory = True
	customer_doc.save()
	frappe.msgprint("Style updated sucessfully")

def get_rm_items(doctype, txt, searchfield, start, page_len, filters):
	if not filters:
		return []

	filters = frappe._dict(filters)

	doc = frappe.get_doc('Item', filters.item_code)
	if doc.allowed_raw_materials:
		item_codes = doc.allowed_raw_materials.split('\n')
		return frappe.get_all('Item', fields = ["name", "item_name"],
			filters={'name': ('in', item_codes)}, as_list=1)
	else:
		return frappe.db.sql(""" select name, item_name from `tabItem` where item_group = 'Raw Material'
			and (name like %(txt)s or item_name like %(txt)s) and disabled = 0""", {'txt': '%%%s%%' % (txt)}, as_list=1)

@frappe.whitelist()
def get_item_details(item_code):
	return frappe.db.get_value('Item', item_code, ['default_supplier', 'default_warehouse'])

@frappe.whitelist()
def get_delivery_days():
	return cint(frappe.db.get_single_value("Selling Settings", "delivery_days"))  or 0