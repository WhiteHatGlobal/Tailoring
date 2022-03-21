# -*- coding: utf-8 -*-
# Copyright (c) 2019, Lagan Jaiswal and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document

class CustomerMeasurement(Document):
	def validate(self):
		self.get_measurements()

	def get_measurements(self):
		if self.measurement_template and not self.get("measurements"):
			for d in frappe.get_all("Measurement Fields", 
				fields = ["measurement_field", "measurement_value", "image", "image_html"],
				filters = {'parenttype': 'Measurement Template',
				'parentfield': 'measurement_fields', 'parent': self.measurement_template},
				order_by="idx"):
				self.append('measurements', d)
				
