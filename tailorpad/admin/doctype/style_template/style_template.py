# -*- coding: utf-8 -*-
# Copyright (c) 2015, Lagan Jaiswal and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from frappe.utils import cint, cstr
from frappe.model.document import Document

class StyleTemplate(Document):
	def validate(self):
		self.duplicate_style_default()
		self.atleast_one_default()

	def duplicate_style_default(self):
		style_dict = {}
		for style in self.style_fields:
			pass
			# if cint(style.default) == 1 and style_dict.count(style.style_field):
			 #	frappe.msgprint("inside")

	def atleast_one_default(self):
		has_default = set([d.style_field for d in self.style_fields if d.default])
		style_fields = set([d.style_field for d in self.style_fields])

		if len(has_default) != len(style_fields):
			for d in style_fields:
				if d not in has_default:
					frappe.throw(_("At least one default style name is required for style {0}").format(d))
		style = []
		for d in self.get('style_fields'):
			if d.style_field in style and d.default:
				frappe.throw(("You Cannot Select Style {0} Default Multiple Times".format(d.style_field)))
			if d.default:
				style.append(d.style_field)
	def on_update(self):
		for d in self.style_fields:
			name = frappe.db.get_value('Style Name', d.style_option, 'name')
			if not name:
				doc = make_style_name(d.style_field, d.style_option)
			else:
				doc = frappe.get_doc('Style Name', name)

			styles = [e.style_field for e in doc.styles]
			if d.style_field not in styles:
				doc.append('styles', {
					'style_field': d.style_field 
				})
			doc.save(ignore_permissions=True)

def make_style_name(style_field, style_option):
	doc = frappe.get_doc({
		'doctype': 'Style Name',
		'style_name': style_option,
		'style': style_field
	}).insert(ignore_permissions=True)

	return doc