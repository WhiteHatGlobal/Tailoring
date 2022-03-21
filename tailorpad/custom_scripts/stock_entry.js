frappe.ui.form.on('Stock Entry', {
	material_purpose: function(frm) {
		frm.trigger("set_purpose")
		var doc = frm.doc;

		frm.fields_dict["items"].grid.set_column_disp("source_warehouse", doc.material_purpose!='Material Receipt');
		frm.fields_dict["items"].grid.set_column_disp("target_warehouse", doc.material_purpose!='Material Issue');
	},
	set_purpose: function(frm) {
		if(frm.doc.material_purpose == 'Material In') {
			frm.set_value('purpose', 'Material Receipt')
		} else if(frm.doc.material_purpose == 'Material Out') {
			frm.set_value('purpose', 'Material Issue')
		} else {
			frm.set_value('purpose', frm.doc.material_purpose)
		}
	},

	setup: function(frm) {
		var doc = frm.doc;

		frm.fields_dict["items"].grid.set_column_disp("source_warehouse", doc.material_purpose!='Material Receipt');
		frm.fields_dict["items"].grid.set_column_disp("target_warehouse", doc.material_purpose!='Material Issue');
	},

	refresh: function(frm) {
		frm.fields_dict.items.grid.refresh();
	},

	items_add: function(frappe, cdt, cdn) {
		var doc = frm.doc;
		var row = frappe.get_doc(cdt, cdn);

		if(!row.source_warehouse) row.source_warehouse = frm.doc.from_warehouse;
		if(!row.target_warehouse) row.target_warehouse = frm.doc.to_warehouse;
		refresh_field('items')
	}
})

frappe.ui.form.on('Stock Entry Detail', {
	source_warehouse: function(frm, cdt, cdn) {
		var child = locals[cdt][cdn];
		frappe.model.set_value(cdt, cdn, 's_warehouse', child.source_warehouse)
	},

	target_warehouse: function(frm, cdt, cdn) {
		var child = locals[cdt][cdn];
		frappe.model.set_value(cdt, cdn, 't_warehouse', child.target_warehouse)
	}
})