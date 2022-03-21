# Copyright (c) 2022, White Hat Global and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from frappe.utils import cint, cstr
from frappe.model.document import Document

class ProductOptions(Document):
	def validate(self):
		self.duplicate_product_default()
		self.atleast_one_default()

	def duplicate_product_default(self):
		product_dict = {}
		for product in self.product_fields:
			pass
			# if cint(style.default) == 1 and style_dict.count(style.style_field):
			 #	frappe.msgprint("inside")

	def atleast_one_default(self):
		has_default = set([d.product_field for d in self.product_fields if d.default])
		product_fields = set([d.product_field for d in self.product_fields])

		if len(has_default) != len(product_fields):
			for d in product_fields:
				if d not in has_default:
					frappe.throw(_("At least one default product name is required for product {0}").format(d))
		product = []
		for d in self.get('product_fields'):
			if d.product_field in product and d.default:
				frappe.throw(("You Cannot Select Product {0} Default Multiple Times".format(d.product_field)))
			if d.default:
				product.append(d.product_field)
	def on_update(self):
		for d in self.product_fields:
			name = frappe.db.get_value('Product Name', d.product_option, 'name')
			if not name:
				doc = make_product_name(d.product_field, d.product_option)
			else:
				doc = frappe.get_doc('Product Name', name)

			products = [e.product_field for e in doc.products]
			if d.product_field not in products:
				doc.append('products', {
					'product_field': d.product_field 
				})
			doc.save(ignore_permissions=True)

def make_product_name(product_field, product_option):
	doc = frappe.get_doc({
		'doctype': 'Product Name',
		'product_name': product_option,
		'product': product_field
	}).insert(ignore_permissions=True)

	return doc