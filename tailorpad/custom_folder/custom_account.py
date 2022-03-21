from __future__ import unicode_literals
import frappe
from erpnext.accounts.doctype.journal_entry.journal_entry import get_payment_entry
from erpnext.accounts.utils import get_balance_on, get_account_currency
from erpnext.accounts.party import get_party_account
from frappe.utils import flt, cint, cstr, nowdate
from frappe import _, throw

def submit_event(doc, method):
    make_advance_payment(doc)

def make_advance_payment(doc):
    if doc.advance_payment_amount and not doc.on_submit_make_payment_request:
        amount = doc.advance_payment_amount
        account = get_account(doc)
        make_jv(doc, amount, account)

def get_account(doc):
    account_data = frappe.db.get_value('Company', doc.company, '*', as_dict=1)
    validate_accounts(doc.type_of_payment, account_data)
    account = account_data.default_cash_account if doc.type_of_payment == 'Cash' else account_data.default_bank_account
    return account

def validate_accounts(type_of_payment, account_data):
    if type_of_payment == 'Cash' and not account_data.default_cash_account:
        frappe.throw(_("Select default cash account in company {0}").format(doc.company))
    elif not account_data.default_bank_account:
        frappe.throw(_("Select default bank account in company {0}").format(doc.company))

def make_jv(doc, amount, account):
    voucher_mapper = {'Cash': 'Cash Entry', 'Bank': 'Bank Entry', 'Credit Card': 'Credit Card Entry'}
    party_type = "Customer"
    amount_field_party = "credit_in_account_currency"
    amount_field_bank = "debit_in_account_currency"

    party_account = get_party_account(party_type, doc.get(party_type.lower()), doc.company)
    party_account_currency = get_account_currency(party_account)

    jv = get_payment_entry(doc, {
    	"party_type": party_type,
    	"party_account": party_account,
    	"party_account_currency": party_account_currency,
    	"amount_field_party": amount_field_party,
    	"amount_field_bank": amount_field_bank,
    	"amount": amount,
    	"remarks": 'Advance Payment received against {0} {1}'.format(doc.doctype, doc.name),
    	"is_advance": "Yes"
    })

    jv['posting_date'] = nowdate()
    jv['voucher_type'] = voucher_mapper.get(doc.type_of_payment)
    for data in jv['accounts']:
        if data['account_type'] != 'Receivable':
            data['account_type'] = doc.type_of_payment
            data['account'] = account

    jv['cheque_no'] = doc.name
    jv['cheque_date'] = nowdate()
    jv_obj = frappe.get_doc(jv)
    jv_obj.submit()

def cancel_event(doc, method):
    for data in frappe.db.get_values('Journal Entry Account', {'reference_name': doc.name, 'docstatus': '>2'}, 'parent', as_dict=1):
        frappe.throw(_('Sales Order linked with Journal Entry {0}, delete it').format(data.parent))
