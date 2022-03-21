// Copyright (c) 2021, White Hat Global and contributors
// For license information, please see license.txt

frappe.ui.form.on('Work Order', 'refresh', function(frm, cdt, cdn){
	if (frm.doc.body_measurement_fields.length>0){
		cur_frm.toggle_display("body_measurement_fields",true);
	}else{
		cur_frm.toggle_display("body_measurement_fields",false);
	}
	if (frm.doc.measurement_fields.length>0){
		cur_frm.toggle_display("measurement_fields",true);
	}else{
		cur_frm.toggle_display("measurement_fields",false);
	}
	if (frm.doc.alteration_measurement_fields.length>0){
		cur_frm.toggle_display("alteration_measurement_fields",true);
	}else{
		cur_frm.toggle_display("alteration_measurement_fields",false);
	}
	if (frm.doc.style_fields.length>0){
		cur_frm.toggle_display("style_fields",true);
		cur_frm.toggle_display("extra_style_cost",false);
	}else{
		cur_frm.toggle_display("style_fields",false);
		cur_frm.toggle_display("extra_style_cost",false);
	}
	if (frm.doc.product_fields.length>0){
		cur_frm.toggle_display("product_fields",true);
		cur_frm.toggle_display("cost_to_customer",true);

	}else{
		cur_frm.toggle_display("product_fields",false);
		cur_frm.toggle_display("cost_to_customer",false);
	}

	//cur_frm.get_field("body_measurement_fields").grid.grid_rows[0].columns.measurement_field.df.read_only = 1;
	//cur_frm.get_field("measurement_fields").grid.grid_rows[0].columns.measurement_field.df.read_only = 1;
	//cur_frm.get_field("alteration_measurement_fields").grid.grid_rows.columns.measurement_field.df.read_only = 1;
	//cur_frm.get_field("style_fields").grid.grid_rows[0].columns.style_field.df.read_only = 1;
	//frm.refresh_fields();
	cur_frm.fields_dict['body_measurement_fields'].grid.wrapper.find('.grid-remove-rows').hide();
	cur_frm.fields_dict['body_measurement_fields'].grid.wrapper.find('.grid-add-row').hide();
	cur_frm.fields_dict['measurement_fields'].grid.wrapper.find('.grid-remove-rows').hide();
	cur_frm.fields_dict['measurement_fields'].grid.wrapper.find('.grid-add-row').hide();
	cur_frm.fields_dict['alteration_measurement_fields'].grid.wrapper.find('.grid-remove-rows').hide();
	cur_frm.fields_dict['alteration_measurement_fields'].grid.wrapper.find('.grid-add-row').hide();
	cur_frm.fields_dict['style_fields'].grid.wrapper.find('.grid-remove-rows').hide();
	cur_frm.fields_dict['style_fields'].grid.wrapper.find('.grid-add-row').hide();
	cur_frm.fields_dict['product_fields'].grid.wrapper.find('.grid-remove-rows').hide();
	cur_frm.fields_dict['product_fields'].grid.wrapper.find('.grid-add-row').hide();

	//frm.set_df_property('measurement_field', 'read_only', 1, frm.doc.name, 'measurement_fields', 'Measurement Fields')
//	frm.set_df_property('image', 'read_only', 1, frm.doc.name, 'measurement_fields', 'Measurement Fields')
//	frm.set_df_property('style_field', 'read_only', 1, frm.doc.name, 'style_fields', 'Style fields')
	// frm.set_df_property('style_name', 'read_only', 1, frm.doc.name, 'style_fields', 'Style fields')
	//frm.set_df_property('image', 'read_only', 1, frm.doc.name, 'style_fields', 'Style fields')
	//frm.set_df_property('default', 'in_list_view', 0, frm.doc.name, 'style_fields', 'Style fields')
	if(frm.doc.docstatus == 1 && frm.doc.__onload.have_production_order) {
	  cur_frm.add_custom_button("Production Order", function(){
		frappe.route_options = {
		  "work_order": frm.doc.name
		};
		frappe.set_route("List", 'Production Order');
	  });
  
	  cur_frm.add_custom_button("Modified Work Order", function(){
		frappe.route_options = {
		  "modified_work_order": frm.doc.name
		};
		frappe.set_route("List", 'Work Order');
	  });
  
	  cur_frm.add_custom_button("Fit Session", function(){
		frappe.route_options = {
		  "work_order": frm.doc.name
		};
		frappe.set_route("List", 'Fit Session');
	  });
  
	  cur_frm.add_custom_button("Purchase Order", function(){
		frappe.route_options = {
		  "work_order": frm.doc.name
		};
		frappe.set_route("List", 'Purchase Order');
	  });
	}
  
	if(frm.doc.serial_no) {
	  cur_frm.add_custom_button("Serial No", function(){
		frappe.route_options = {
		  "work_order": frm.doc.name
		};
		frappe.set_route("List", 'Serial No');
	  });
	}
  })
  
  frappe.ui.form.on('Work Order', {
	attach_image: function() {
	  refresh_field("image");
	}
  })
  
  
  cur_frm.cscript.import_measurement_from_work_order = function(doc, cdt, cdn){
	//get_server_fields('get_measurement_from_wo', '', '', doc, cdt, cdn, 1, function(r){
	  refresh_field('measurement_fields')
	//})
  }
  
  cur_frm.cscript.import_style_from_work_order = function(doc, cdt, cdn){
	//get_server_fields('get_style_from_wo', '', '', doc, cdt, cdn, 1, function(r){
	  refresh_field('style_fields')
	//})
  }
  
  cur_frm.fields_dict['style_fields'].grid.get_field('style_name').get_query = function(frm,cdt,cdn) {
	var child = locals[cdt][cdn];
	var doc = cur_frm.doc;
	return{
	  query: "tailorpad.admin.doctype.work_order.work_order.get_style_name",
	  filters:{ 'style_field': child.style_field,
	  'style_template': doc.style_template
	}
	}
  }
  
  cur_frm.fields_dict['product_fields'].grid.get_field('product_name').get_query = function(frm,cdt,cdn) {
	var child = locals[cdt][cdn];
	var doc = cur_frm.doc;
	return{
	  query: "tailorpad.admin.doctype.work_order.work_order.get_product_name",
	  filters:{ 'product_field': child.product_field,
	  'product_option': doc.product_option
	}
	}
  }

  cur_frm.fields_dict['items'].grid.get_field("item_code").get_query = function(doc, cdt, cdn) {
	var child = locals[cdt][cdn];
	return {
	  query: "tailorpad.custom_folder.custom_selling.get_item_codes",
	  filters: {
		item_code: doc.item_code
	  }
	}
  }
  
  cur_frm.fields_dict['import_measurement_from_work_order'].get_query = function(doc, cdt, cdn) {
	  return{
	  query: "tailorpad.admin.doctype.work_order.work_order.work_orderlink",
	  filters:{ 'work_order': doc.name, 'customer': doc.customer, 'item_code': doc.item_code}
	  }
  }
  
  cur_frm.fields_dict['import_style_from_work_order'].get_query = function(doc, cdt, cdn) {
	  return{
	  query: "tailorpad.admin.doctype.work_order.work_order.work_orderlink",
	  filters:{ 'work_order': doc.name, 'customer': doc.customer, 'item_code': doc.item_code}
	  }
  }
  
  cur_frm.fields_dict['measured_by'].get_query = function(doc, cdt, cdn) {
	  return{
	  filters: { 'designation': 'Master'}
	  }
  }
  
  cur_frm.cscript.style_name = function(doc, cdt, cdn) {
	var d = locals[cdt][cdn]
	if(d.style_name) {
		frappe.call({
	  method: 'tailorpad.admin.doctype.work_order.work_order.get_style_name_data',
	  args: {'item_code': doc.item_code, 'style_field': d.style_field, 'style_name': d.style_name},
	  freeze: true,
	  callback: function(r){
		if(r.message){
		  $.each(['note', 'image', 'html_image', 'cost_to_customer'], function(i,d){
			  frappe.model.set_value(cdt, cdn, d, r.message[d])
		  })
		}
	  }
	})    
	}
	
  }
  
  cur_frm.cscript.product_name = function(doc, cdt, cdn) {
	var d = locals[cdt][cdn]
	if(d.product_name) {
		frappe.call({
	  method: 'tailorpad.admin.doctype.work_order.work_order.get_product_name_data',
	  args: {'item_code': doc.item_code, 'product_field': d.product_field, 'product_name': d.product_name},
	  freeze: true,
	  callback: function(r){
		if(r.message){
		  $.each(['note', 'image', 'html_image', 'cost_to_customer'], function(i,d){
			  frappe.model.set_value(cdt, cdn, d, r.message[d])
		  })
		}
	  }
	})    
	}
	
  }

  cur_frm.cscript.measurement_fields_toggle_view = function(doc){
  }
  
  cur_frm.cscript.change_style = function(doc, cdt, cdn){
	var d = locals[cdt][cdn]
	frappe.call({
	  method: 'tailorpad.admin.doctype.work_order.work_order.get_style_data',
	  args: {'args': doc, 'style_field': d.style_field},
	  freeze: true,
	  callback: function(r){
		if(r.message){
			frappe.ChangeStyle(r.message,doc);
		  //new ChangeStyle(r.message, doc)
		}
	  }
	})
  }
  /*
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
		 <tr style="background-color:#D1D1D1"><td>Sr No</td><td>Style Name</td><td>Image</td><td>Cost to Customer</td><td>Select</td></tr>\
		 </thead><tbody></tbody></table></div><hr>', {'style': r})).appendTo($(me.div))
  
		  $.each(v, function(i, value){
			$(repl('<tr><td data-value="%(style_field)s">'+(i+1)+'</td><td>%(style_name)s</td>\
			   <td><img width="100" src="%(image)s"></td><td>%(cost_to_customer)s</td>\
			   <td><input class="check-val" type="radio" name="%(style_field)s" %(is_checked)s></td></tr>', value)).appendTo($(me.table.find('tbody')))
		  })
	  })
	  me.update_style()
	},
	update_style: function(){
	  var me = this;
	  var name_list = ['style_field', 'style_name', 'html_image', 'cost_to_customer']
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
		$.each(me.doc.style_fields, function(k,d){
		  if(value['style_field'] == d.style_field){
			frappe.model.set_value(d.doctype, d.name, 'style_name', value['style_name'])
			frappe.model.set_value(d.doctype, d.name, 'cost_to_customer', value['cost_to_customer'])
			frappe.model.set_value(d.doctype, d.name, 'image', value['html_image'])
			frappe.model.set_value(d.doctype, d.name, 'html_image', '<img width="100" src="'+value['html_image']+'">')
		  }
		})
	  })
	  this.dialog.hide()
	  cur_frm.save()
	}
  })
  */
  
  frappe.ui.form.on("BOM Item", {
	item_code: function(frm, cdt, cdn) {
	  var item = locals[cdt][cdn];
	  if(item.item_code) {
		  frappe.call({
		  method: "erpnext.stock.get_item_details.get_item_details",
		  child: item,
		  args: {
			args: {
			  item_code: item.item_code,
			  customer: frm.doc.customer,
			  company: frm.doc.company,
			  name: frm.doc.name,
			  qty: item.qty || 1,
			  stock_qty: item.stock_qty
			}
		  },
  
		  callback: function(r) {
			if(!r.exc) {
				var d = locals[cdt][cdn];
				$.each(r.message, function(k, v) {
				  if(!d[k]) d[k] = v;
				});
			  refresh_field('items')
			}
		  }
	  })
	  }
	}
  })
	frappe.ui.form.on('Work Order', {
	measurement_fields_on_form_rendered : function(frm,grid_row,cdt,cdn) {
		var grid_row = cur_frm.open_grid_row();
		grid_row.grid_form.fields_dict.measurement_field.df.read_only = true;
		grid_row.grid_form.fields_dict.measurement_field.refresh();
	},
	body_measurement_fields_on_form_rendered : function(frm,grid_row,cdt,cdn) {
			var grid_row = cur_frm.open_grid_row();
			grid_row.grid_form.fields_dict.measurement_field.df.read_only = true;
			grid_row.grid_form.fields_dict.measurement_field.refresh();
		},
	alteration_measurement_fields_on_form_rendered : function(frm,grid_row,cdt,cdn) {
				var grid_row = cur_frm.open_grid_row();
				grid_row.grid_form.fields_dict.measurement_field.df.read_only = true;
				grid_row.grid_form.fields_dict.measurement_field.refresh();
			},
	style_fields_on_form_rendered : function(frm,grid_row,cdt,cdn) {
					var grid_row = cur_frm.open_grid_row();
					grid_row.grid_form.fields_dict.style_field.df.read_only = true;
					grid_row.grid_form.fields_dict.style_field.refresh();
				},
});

cur_frm.fields_dict.bom_no.get_query = function(doc) {
	return {filters: { item: doc.item_code}}
  }
  


  //ChangeStyle = Class.extend({
frappe.ChangeStyle = Class.extend({
	//frappe.ui.form.ChangeStyle = Class.extend({
	  init: function(args, doc){
		var me = this;
		this.args = args;
		this.doc = doc;
	   //this.make_template()
	  //this.render_data()
		//this.run_serially([
			//	make_template()
			//	() => console.log(prompt),
				//() => formulation.esign_auth(frm,prompt,state,functions,status),
		  // 	   	    ]);
	
	  //},
	 // make_template: function(){
		this.dialog = new frappe.ui.Dialog({
		  title: __('Style List'),
		  fields: [{fieldtype: "HTML", fieldname: "datalist"}]
		})
	
	  //},
	  //render_data: function(){
		var me = this;
		this.dialog.show();
		this.div = $('<div style="height:500px; overflow:auto" class="style_div"></div>').appendTo($(me.dialog.fields_dict.datalist.wrapper))
		$.each(me.args, function(r,v){
		  me.table = $(repl('<div class="section-head"><b>Style Option: %(style)s</b></div>\
		   <div class="section-body"><table class="table table-bordered" class="datalist_table"><thead>\
		   <tr style="background-color:#D1D1D1"><td>Sr No</td><td>Style Option</td><td>Image</td><td>Cost to Customer</td><td>Select</td></tr>\
		   </thead><tbody></tbody></table></div><hr>', {'style': r})).appendTo($(me.div))
	
			$.each(v, function(i, value){
			  $(repl('<tr><td data-value="%(style_field)s">'+(i+1)+'</td><td>%(style_option)s</td>\
				 <td><img width="100" src="%(image)s"></td><td>%(cost_to_customer)s</td>\
				 <td><input class="check-val" type="radio" name="%(style_field)s" %(is_checked)s></td></tr>', value)).appendTo($(me.table.find('tbody')))
			})
		})

	   // me.update_style()
	  //},
	  //update_style: function(){
		//var me = this;
		var name_list = ['style_field', 'style_option', 'html_image', 'cost_to_customer']
		var data_list = []
		//primary_action_label: __('Update'){
		this.dialog.set_primary_action(__("Update"), function() {
		  var me = this;
		  var a = this.get_values()["datalist_table"];
		//})
		//this.dialog.$wrapper.find((('table tr')), function(i,tr_value){
		  $.each($(me.div.find('table tr')), function(i,tr_value){
			//$.each($(me.div.find('table tr')), function(i,tr_value){
				//$.each(me.args, function(i,tr_value){
			  var style_dict = {}
			  if($(tr_value).find('.check-val').is(':checked')){
				$.each($(tr_value).find('td'), function(r, v){
				  value = $(v).attr("data-value") || $(v).text() || $(v).find('img').attr("src")
				  style_dict[name_list[r]] = value;
				})
				data_list.push(style_dict)
			  }
			
		  })
		//  me.update_value()
	   // })
	  
	  //},
	  //update_value: function(){
		var me = this;
		$.each(data_list, function(key, value){
		  $.each(doc.style_fields, function(k,d){
			if(value['style_field'] == d.style_field){
			  frappe.model.set_value(d.doctype, d.name, 'style_name', value['style_option'])
			  frappe.model.set_value(d.doctype, d.name, 'cost_to_customer', value['cost_to_customer'])
			  frappe.model.set_value(d.doctype, d.name, 'image', value['html_image'])
			  frappe.model.set_value(d.doctype, d.name, 'html_image', '<img width="100" src="'+value['html_image']+'">')
			}
	
	
		  })//this one
	
	
		  })
		})
		this.dialog.hide()
		//cur_frm.save()
	  }
	})
	//}
	
	