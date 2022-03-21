// Copyright (c) 2021, White Hat Global and contributors
// For license information, please see license.txt

frappe.ui.form.on('Customer Measurement', {
	// refresh: function(frm) {

	// }
});

frappe.ui.form.on('Customer Measurement Entry', 'image', function(frm, cdt, cdn){
	var d = locals[cdt][cdn]
	var image_view = repl('<img width="100" src="%(image)s">', {image: d.image});
	frappe.model.set_value('Customer Measurement Entry', d.name, 'image_html', image_view)
	cur_frm.refresh_fields();
  })
  