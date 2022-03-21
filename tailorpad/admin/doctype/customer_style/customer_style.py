# -*- coding: utf-8 -*-
# Copyright (c) 2019, Lagan Jaiswal and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document

class CustomerStyle(Document):
	def validate(self):
		get_style_fields(self)
#@frappe.whitelist()
def get_style_fields(self):
		if self.style_template and not self.get("styles"):
			for d in frappe.db.sql(""" select s.style_name, 
				s.style_field, s.image, s.html_image, s.default
				from `tabStyle fields` as s 
				where parenttype = 'Style Template' and parentfield = 'style_fields'
				and parent = %s order by s.idx""", self.style_template, as_dict=1):
				if d.default:
					self.append('styles', d)
