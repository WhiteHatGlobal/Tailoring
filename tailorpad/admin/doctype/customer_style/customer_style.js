// Copyright (c) 2019, Lagan Jaiswal and contributors
// For license information, please see license.txt

frappe.ui.form.on('Customer Style', {
	refresh: function(frm) {

	},

	style_template: function(frm) {
	//	frm.trigger("get_style_fields");
	},
	
	get_style_fields: function(frm) {
		frm.doc.styles = [];
		frappe.call({
			method: 'get_style_fields',
      doc: frm.doc,
			callback: function(r, rt) {
				refresh_field("styles")
			}
		})
	}
});

frappe.ui.form.on('Customer Style', 'style_name', function(frm, cdt, cdn){ 
  var d = locals[cdt][cdn]
  style_template = doc.style_template;
  if(d.style_name) {
    frappe.call({
    method: 'tailorpad.admin.doctype.work_order.work_order.get_style_name_data_for_customer',
    args: {'style_template': style_template, 'style_field': d.style_field, 'style_name': d.style_name},
    freeze: true,
    callback: function(r){
      console.log(r.message)
      if(r.message){
        $.each(['note', 'image', 'html_image'], function(i,d){
            frappe.model.set_value(cdt, cdn, d, r.message[d])
        })
      }
    }
  })
  }
})


cur_frm.cscript.image =function(doc, cdt, cdn){
    var d =locals[cdt][cdn]
    image_view = repl('<img width="100" src="%(image)s">', {image: d.image});
    frappe.model.set_value('Customer Style Entry', d.name, 'html_image', image_view)
    refresh_field('image_view', d.name, 'styles')
}

cur_frm.fields_dict['styles'].grid.get_field('style_name').get_query = function(frm, cdt, cdn) {
  var child = locals[cdt][cdn];
  return{
    query: "tailorpad.admin.doctype.work_order.work_order.get_style_name",
    filters:{ 'style_field': child.style_field}
  }
}


/*
cur_frm.cscript.change_style = function(doc, cdt, cdn){
  var d = locals[cdt][cdn]
  frappe.call({
    method: 'tailorpad.admin.doctype.work_order.work_order.get_style_data',
    args: {'args': doc, 'style_field': d.style_field},
    freeze: true,
    callback: function(r){
      
      if(r.message){
        new ChangeStyle(r.message, doc)
      }
    }
  })
}





ChangeStyle = Class.extend({
  init: function(args, doc){
    this.args = args;
    this.doc = doc;
    this.make_template()
    this.render_data()
  },
  make_template: function(){
    this.dialog = new frappe.ui.Dialog({
      title: __('Style List'),
      fields: [{fieldtype: "HTML", fieldname: "datalist"}]
    })

  },
  render_data: function(){
    var me = this;
    this.dialog.show();
    this.div = $('<div style="height:500px; overflow:auto" class="style_div"></div>').appendTo($(me.dialog.fields_dict.datalist.wrapper))
    $.each(me.args, function(r,v){
      me.table = $(repl('<div class="section-head"><b>Style Name: %(style)s</b></div>\
       <div class="section-body"><table class="table table-bordered" class="datalist_table"><thead>\
       <tr style="background-color:#D1D1D1"><td>Sr No</td><td>Style Name</td><td>Image</td><td>Select</td></tr>\
       </thead><tbody></tbody></table></div><hr>', {'style': r})).appendTo($(me.div))

        $.each(v, function(i, value){
          $(repl('<tr><td data-value="%(style_field)s">'+(i+1)+'</td><td>%(style_name)s</td>\
             <td><img width="100" src="%(image)s"></td>\
             <td><input class="check-val" type="radio" name="%(style_field)s" %(is_checked)s></td></tr>', value)).appendTo($(me.table.find('tbody')))
        })
    })
    me.update_style()
  },
  update_style: function(){
    var me = this;
    var name_list = ['style_field', 'style_name', 'html_image']
    this.data_list = []
    this.dialog.set_primary_action(__("Update"), function() {
      $.each($(me.div.find('table tr')), function(i,tr_value){
          style_dict = {}
          if($(tr_value).find('.check-val').is(':checked')){
            $.each($(tr_value).find('td'), function(r, v){
              value = $(v).attr("data-value") || $(v).text() || $(v).find('img').attr("src")
              style_dict[name_list[r]] = value;
            })
            me.data_list.push(style_dict)
          }
      })
      me.update_value()
    })
  },
  update_value: function(){
    var me = this;
    $.each(me.data_list, function(key, value){
      $.each(me.doc.styles, function(k,d){
        if(value['style_field'] == d.style_field){
          frappe.model.set_value(d.doctype, d.name, 'style_name', value['style_name'])
          //frappe.model.set_value(d.doctype, d.name, 'cost_to_customer', value['cost_to_customer'])
          frappe.model.set_value(d.doctype, d.name, 'image', value['html_image'])
          frappe.model.set_value(d.doctype, d.name, 'html_image', '<img width="100" src="'+value['html_image']+'">')
        }
      })
    })
    this.dialog.hide()
    refresh_field("styles")
    // cur_frm.save()
  }
})*/
frappe.ui.form.on('Customer Style Entry', 'image', function(frm, cdt, cdn){
    var d = locals[cdt][cdn]
    image_view = repl('<img width="100" src="%(image)s">', {image: d.image});
    frappe.model.set_value('Customer Style Entry', d.name, 'html_image', image_view)
    refresh_field('image_view', d.name, 'styles')
})
