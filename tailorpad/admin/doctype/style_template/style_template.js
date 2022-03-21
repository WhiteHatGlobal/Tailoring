// Copyright (c) 2021, White Hat Global and contributors
// For license information, please see license.txt

frappe.ui.form.on('Style Template', {
	 refresh: function(frm) {

	 }
});

cur_frm.cscript.image =function(doc, cdt, cdn){
    var d =locals[cdt][cdn]
    var image_view = repl('<img width="100" src="%(image)s">', {image: d.image});
    frappe.model.set_value('Style fields', d.name, 'html_image', image_view)
    refresh_field('image_view', d.name, 'style_fields')
}
