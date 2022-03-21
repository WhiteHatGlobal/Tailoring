from __future__ import unicode_literals
import frappe, json
from erpnext.selling.doctype.customer.customer import make_customer_measurement, make_customer_style
from frappe.utils import cstr, cint, flt
from frappe import _, throw
from frappe.core.doctype.user.user import sign_up

@frappe.whitelist(allow_guest=True)
def sign_up(email, full_name):
	sign_up(email, full_name, '')


@frappe.whitelist(allow_guest=True)
def get_count():
	doctype = frappe.form_dict.get('doctype')
	filters = json.loads(frappe.form_dict.get('filters') or '{}')
	if doctype:
		return frappe.db.count(doctype, filters=filters)


@frappe.whitelist(allow_guest=True)
def make_customer_measurement_data():
		customer = frappe.form_dict.get('customer')
		measurement_template = frappe.form_dict.get('measurement_template')

		return make_customer_measurement(customer, measurement_template)

@frappe.whitelist(allow_guest=True)
def make_customer_style_data():
		customer = frappe.form_dict.get('customer')
		style_template = frappe.form_dict.get('style_template')

		return make_customer_style(customer, style_template)

