from __future__ import unicode_literals
from frappe import _

def get_data():
	return {
		'heatmap': True,
		'heatmap_message': _('This is based on stock movement. See {0} for details')\
			.format('<a href="#query-report/Stock Ledger">' + _('Stock Ledger') + '</a>'),
		'fieldname': 'item_code',
		'non_standard_fieldnames': {
			'Work Order': 'item_code',
			'Product Bundle': 'new_item_code',
			'BOM': 'item',
			'Batch': 'item',
            'Production Order': 'production_item'
		},
		'transactions': [
			{
				'label': _('Groups'),
				'items': ['BOM', 'Sales Order', 'Delivery Note', 'Sales Invoice']
			},
			{
				'label': _('Buy'),
				'items': ['Purchase Order', 'Purchase Receipt', 'Purchase Invoice']
			},
			{
				'label': _('Manufacture'),
				'items': ['Production Plan', 'Work Order', 'Item Manufacturer', 'Production Order']
			}
			
		]
	}
