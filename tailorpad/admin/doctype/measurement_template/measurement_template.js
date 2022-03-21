// Copyright (c) 2021, White Hat Global and contributors
// For license information, please see license.txt

frappe.ui.form.on('Measurement Template', {
	// refresh: function(frm) {

	// }
});

frappe.ui.form.on('Measurement Fields', 'image', function(frm, cdt, cdn){
	var d = locals[cdt][cdn]
	var image_view = repl('<img width="100" src="%(image)s">', {image: d.image});
	frappe.model.set_value('Measurement Fields', d.name, 'image_html', image_view)
	cur_frm.refresh_fields();
  })
  