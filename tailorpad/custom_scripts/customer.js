frappe.provide("erpnext");
frappe.provide("erpnext.utils");

frappe.ui.form.on('Customer', 'validate', function(frm){
  if (frm.doc.customer_name && frm.doc.last_name){
    frm.doc.full_name = frm.doc.customer_name + ' ' + frm.doc.last_name;
  }
  else{
    frm.doc.full_name = frm.doc.customer_name
  }
  if(frm.doc.measurement_fields){
    for (var i = 0;i<frm.doc.measurement_fields.length;i++){
        var m = cur_frm.add_child("customer_measurement_data");
              m.measurement_template = frm.doc.new_measurement_template
              m.measurement_field = frm.doc.measurement_fields[i].measurement_field
              m.measurement_value = frm.doc.measurement_fields[i].measurement_value
              m.note = frm.doc.measurement_fields[i].note
              m.image = frm.doc.measurement_fields[i].image
              m.image_html = frm.doc.measurement_fields[i].image_html
    }
  }
  if(cur_frm.doc.garment_measurement_fields){
    for (var j = 0;j<cur_frm.doc.garment_measurement_fields.length;j++){
         var m = cur_frm.add_child("garment_measurement_data");
              m.measurement_template = cur_frm.doc.new_garment_measurement_template
              m.measurement_field = cur_frm.doc.garment_measurement_fields[j].measurement_field
              m.measurement_value = cur_frm.doc.garment_measurement_fields[j].measurement_value
              m.note = cur_frm.doc.garment_measurement_fields[j].note
              m.image = cur_frm.doc.garment_measurement_fields[j].image
              m.image_html = cur_frm.doc.garment_measurement_fields[j].image_html
    }
  }
  if(cur_frm.doc.alteration_measurement_fields){
    for (var j = 0;j<cur_frm.doc.alteration_measurement_fields.length;j++){
         var m = cur_frm.add_child("alteration_measurement_data");
              m.measurement_template = cur_frm.doc.new_alteration_measurement_template
              m.measurement_field = cur_frm.doc.alteration_measurement_fields[j].measurement_field
              m.measurement_value = cur_frm.doc.alteration_measurement_fields[j].measurement_value
              m.note = cur_frm.doc.alteration_measurement_fields[j].note
              m.image = cur_frm.doc.alteration_measurement_fields[j].image
              m.image_html = cur_frm.doc.alteration_measurement_fields[j].image_html
    }
  }
  if(cur_frm.doc.styles){
    for (var k = 0;k<cur_frm.doc.styles.length;k++){
         var m = cur_frm.add_child("customer_style_data");
              m.style_template = cur_frm.doc.new_style_template
              m.style_field = cur_frm.doc.styles[k].style_field
              m.style_value = cur_frm.doc.styles[k].style_value || cur_frm.doc.styles[k].style_name || cur_frm.doc.styles[k].style_option
              m.note = cur_frm.doc.styles[k].note
              m.image = cur_frm.doc.styles[k].image
              m.image_html = cur_frm.doc.styles[k].image_html || cur_frm.doc.styles[k].html_image
    }
  }
  if(frm.doc.products){
    for (var i = 0;i<frm.doc.products.length;i++){
        var m = cur_frm.add_child("customer_product_data");
              m.product_option = frm.doc.new_product_option
              m.product_field = frm.doc.products[i].product_field
              m.note = frm.doc.products[i].note
              m.image = frm.doc.products[i].image
              m.image_html = frm.doc.products[i].image_html
    }
  }

    if(frm.doc.new_measurement_template){
       cur_frm.set_value('measurement_template', frm.doc.new_measurement_template)
       cur_frm.doc.new_measurement_template = '';
    }
    if(frm.doc.new_garment_measurement_template){
       cur_frm.set_value('garment_template', frm.doc.new_garment_measurement_template)
       cur_frm.doc.new_garment_measurement_template = '';
    }
    if(frm.doc.new_alteration_measurement_template){
        cur_frm.set_value('alteration_template', frm.doc.new_alteration_measurement_template)
        cur_frm.doc.new_alteration_measurement_template = '';
    }
    if(frm.doc.new_style_template){
        cur_frm.set_value('style_template', frm.doc.new_style_template)
        cur_frm.doc.new_style_template = '';
    }
    if(frm.doc.new_product_option){
        cur_frm.set_value('available_product_option', frm.doc.new_product_option)
        cur_frm.doc.new_product_option = '';
    }

})
frappe.ui.form.on('Customer', 'measurement_template', function(frm){
  var doc = frm.doc;
  if(doc.measurement_template && doc.name) {
      frappe.call({
      method: "tailorpad.custom_folder.custom_stock.fetch_customer_measurement",
      args: {'measurement_template': doc.measurement_template, 'parent': doc.name},
      freeze: true,
      callback: function(r){
          if(r.message){
            cur_frm.set_value('new_measurement_template', '')
            cur_frm.set_value('type_of_measurement', r.message[1])
            cur_frm.clear_table("measurement_fields");
            $.each(r.message[0], function(k,v){
              var mfs = cur_frm.add_child("measurement_fields");
              mfs.measurement_field = v.measurement_field
              mfs.measurement_value = v.measurement_value
              mfs.note = v.note
              mfs.image = v.image
              mfs.image_html = v.image_html
            })
            refresh_field('measurement_fields')
          }
      }
    });  
  }
})

frappe.ui.form.on('Customer', 'garment_template', function(frm){
  var doc = frm.doc;
  if(doc.garment_template && doc.name) {
      frappe.call({
      method: "tailorpad.custom_folder.custom_stock.fetch_customer_measurement1",
      args: {'measurement_template': doc.garment_template, 'parent': doc.name},
      freeze: true,
      callback: function(r){
          if(r.message){
            cur_frm.set_value('new_garment_measurement_template', '')
            cur_frm.set_value('type_of_measurement', r.message[1])
            cur_frm.clear_table("garment_measurement_fields");
            $.each(r.message[0], function(k,v){
              var mfs = cur_frm.add_child("garment_measurement_fields");
              mfs.measurement_field = v.measurement_field
              mfs.measurement_value = v.measurement_value
              mfs.note = v.note
              mfs.image = v.image
              mfs.image_html = v.image_html
            })
            refresh_field('garment_measurement_fields')
          }
      }
    });  
  }
})

frappe.ui.form.on('Customer', 'alteration_template', function(frm){
  var doc = frm.doc;
  if(doc.alteration_template && doc.name) {
      frappe.call({
      method: "tailorpad.custom_folder.custom_stock.fetch_customer_measurement2",
      args: {'measurement_template': doc.alteration_template, 'parent': doc.name},
      freeze: true,
      callback: function(r){
          if(r.message){
            cur_frm.set_value('new_alteration_measurement_template', '')
            cur_frm.set_value('type_of_measurement', r.message[1])
            cur_frm.clear_table("alteration_measurement_fields");
            $.each(r.message[0], function(k,v){
              var mfs = cur_frm.add_child("alteration_measurement_fields");
              mfs.measurement_field = v.measurement_field
              mfs.measurement_value = v.measurement_value
              mfs.note = v.note
              mfs.image = v.image
              mfs.image_html = v.image_html
            })
            refresh_field('alteration_measurement_fields')
          }
      }
    });  
  }
})


frappe.ui.form.on('Customer', 'new_measurement_template', function(frm) {
  var doc = frm.doc;
  if(doc.new_measurement_template && doc.name) {
      frappe.call({
      method: "tailorpad.custom_folder.custom_stock.fetch_customer_measurement",
      args: {'measurement_template': doc.new_measurement_template, 'parent': doc.name},
      freeze: true,
      callback: function(r){
          if(r.message){
            cur_frm.set_value('measurement_template', '')
            cur_frm.set_value('type_of_measurement', r.message[1])
            cur_frm.clear_table("measurement_fields");
           // cur_frm.clear_table("customer_measurement_data")
            $.each(r.message[0], function(k,v){
              var mfs = cur_frm.add_child("measurement_fields");
              mfs.measurement_field = v.measurement_field
              mfs.measurement_value = v.measurement_value
              mfs.note = v.note
              mfs.image = v.image
              mfs.image_html = v.image_html
             /* var m = cur_frm.add_child("customer_measurement_data");
              m.measurement_template = cur_frm.doc.new_measurement_template
              m.measurement_field = mfs.measurement_field
              m.measurement_value = mfs.measurement_value
              m.note = mfs.note
              m.image = mfs.image
              m.image_html = mfs.image_html*/
            })
            refresh_field('measurement_fields')
          }
      }
    });
  }
})



frappe.ui.form.on('Customer', 'new_garment_measurement_template', function(frm) {
  var doc = frm.doc;
  if(doc.new_garment_measurement_template && doc.name) {
      frappe.call({
      method: "tailorpad.custom_folder.custom_stock.fetch_itemgarment_measurement",
      args: {'measurement_template': doc.new_garment_measurement_template, 'parent': doc.name},
      freeze: true,
      callback: function(r){
          if(r.message){
            cur_frm.set_value('garment_template', '')
           // cur_frm.set_value('type_of_measurement', r.message[1])
            cur_frm.clear_table("garment_measurement_fields");
            $.each(r.message[0], function(k,v){
             var mfs = cur_frm.add_child("garment_measurement_fields");
              mfs.measurement_field = v.measurement_field
              mfs.measurement_value = v.measurement_value
              mfs.note = v.note
              mfs.image = v.image
              mfs.image_html = v.image_html
             /* var m = cur_frm.add_child("garment_measurement_data");
              m.measurement_template = cur_frm.doc.new_garment_measurement_template
              m.measurement_field = v.measurement_field
              m.measurement_value = v.measurement_value
              m.note = v.note
              m.image = v.image
              m.image_html = v.image_html*/
            })
            refresh_field('garment_measurement_fields')
          }
      }
    });
  }
})

frappe.ui.form.on('Customer', 'new_alteration_measurement_template', function(frm) {
  var doc = frm.doc;
  if(doc.new_alteration_measurement_template && doc.name) {
      frappe.call({
      method: "tailorpad.custom_folder.custom_stock.fetch_itemalteration_measurement",
      args: {'measurement_template': doc.new_alteration_measurement_template, 'parent': doc.name},
      freeze: true,
      callback: function(r){
          if(r.message){
            cur_frm.set_value('alteration_template', '')
           // cur_frm.set_value('type_of_measurement', r.message[1])
            cur_frm.clear_table("alteration_measurement_fields");
            $.each(r.message[0], function(k,v){
              var mfs = cur_frm.add_child("alteration_measurement_fields");
              mfs.measurement_field = v.measurement_field
              mfs.measurement_value = v.measurement_value
              mfs.note = v.note
              mfs.image = v.image
              mfs.image_html = v.image_html
              /*var m = cur_frm.add_child("alteration_measurement_data");
              m.measurement_template = cur_frm.doc.new_alteration_measurement_template
              m.measurement_field = v.measurement_field
              m.measurement_value = v.measurement_value
              m.note = v.note
              m.image = v.image
              m.image_html = v.image_html*/
            })
            refresh_field('alteration_measurement_fields')
          }
      }
    });
  }
})

frappe.ui.form.on('Style fields', 'image', function(frm, cdt, cdn){
    var d = locals[cdt][cdn]
    image_view = repl('<img width="100" src="%(image)s">', {image: d.image});
    frappe.model.set_value('Style fields', d.name, 'html_image', image_view)
    refresh_field('image_view', d.name, 'styles')
})

frappe.ui.form.on('Customer', 'style_template', function(frm){
  var doc = frm.doc;
  if(doc.style_template && doc.name) {
    frappe.call({
      method: "tailorpad.custom_folder.custom_stock.fetch_customer_style",
      args: {'style_template': doc.style_template, 'parent': doc.name},
      freeze: true,
      callback: function(r){
          if(r.message){
            cur_frm.set_value('new_style_template', '')
            cur_frm.set_value('type_of_style', r.message[1])
            cur_frm.clear_table("styles");
            $.each(r.message[0], function(k,v){
              console.log(r.message[0])
              var mfs = cur_frm.add_child("styles");
              mfs.style_field = v.style_field
              mfs.style_name = v.style_value
              mfs.note = v.note
              mfs.default = v.default
              mfs.image = v.image
              mfs.html_image = v.html_image || v.image_html
            })
            refresh_field('styles')
          }
      }
    });
  }
})

frappe.ui.form.on('Customer', 'available_product_option', function(frm){
  var doc = frm.doc;
  if(doc.available_product_option && doc.name) {
    frappe.call({
      method: "tailorpad.custom_folder.custom_stock.fetch_customer_product",
      args: {'product_option': doc.available_product_option, 'parent': doc.name},
      freeze: true,
      callback: function(r){
          if(r.message){
            cur_frm.set_value('new_style_template', '')
           // cur_frm.set_value('type_of_style', r.message[1])
            cur_frm.clear_table("products");
            $.each(r.message[0], function(k,v){
              console.log(r.message[0])
              var mfs = cur_frm.add_child("products");
              mfs.product_field = v.product_field
              mfs.product_option = v.product_options
              mfs.note = v.note
              mfs.default = v.default
              mfs.image = v.image
              mfs.html_image = v.html_image || v.image_html
            })
            refresh_field('products')
          }
      }
    });
  }
})


frappe.ui.form.on('Customer', 'new_style_template', function(frm){
  var doc = frm.doc;
  if(doc.new_style_template && doc.name) {
    frappe.call({
    method: "tailorpad.custom_folder.custom_stock.fetch_customer_style",
    args: {'style_template': doc.new_style_template, 'parent': doc.name},
    freeze: true,
    callback: function(r){
        if(r.message){
          cur_frm.set_value('style_template', '')
         // cur_frm.set_value('type_of_style', r.message[1])
          cur_frm.clear_table("styles");
          $.each(r.message[0], function(k,v){
           // if (v.default == "1"){
            var mfs = cur_frm.add_child("styles");
            mfs.style_field = v.style_field
            mfs.style_name = v.style_name || v.style_value || v.style_option
            mfs.note = v.note
            mfs.default = v.default
            mfs.image = v.image
            mfs.html_image = v.html_image || v.image_html
            mfs.cost_to_customer = v.cost_to_customer
            
          //  var m = cur_frm.add_child("customer_style_data");
           //   m.style_template = cur_frm.doc.new_style_template
           //   m.style_field = v.style_field
            //  m.style_name = v.style_value || v.style_name || v.style_option
            //  m.style_option = v.style_name || v.style_value || v.style_option
            //  m.note = v.note
            //  m.default = v.default
            //  m.image = v.image
            //  m.image_html = v.image_html || v.html_image
           // }
          })
        
          refresh_field('styles')
        }
    }
  });
  }
  
})

frappe.ui.form.on('Customer', 'new_product_option', function(frm){
  var doc = frm.doc;
  if(frm.doc.new_product_option && frm.doc.name) {
    frappe.call({
    method: "tailorpad.custom_folder.custom_stock.fetch_customer_product",
    args: {'product_option': frm.doc.new_product_option, 'parent': frm.doc.name},
    freeze: true,
    callback: function(r){
        if(r.message){
          cur_frm.set_value('available_product_option', '')
          cur_frm.clear_table("products");
          $.each(r.message[0], function(k,v){
            var mfs = cur_frm.add_child("products");
            mfs.product_field = v.product_field
            mfs.product_name = v.product_name || v.product_value || v.product_option
            mfs.note = v.note
            mfs.default = v.default
            mfs.image = v.image
            mfs.html_image = v.html_image || v.image_html
            mfs.cost_to_customer = v.cost_to_customer
                      })
        
          refresh_field('products')
        }
    }
  });
  }
  
})

/*
frappe.ui.form.on('WO Style Field', 'style_name', function(frm, cdt, cdn){ 
  var d = locals[cdt][cdn]
  var doc = frm.doc;
  style_template = frm.doc.style_template || frm.doc.new_style_template;
  if(d.style_name) {
    frappe.call({
    method: 'tailorpad.admin.doctype.work_order.work_order.get_style_name_data_for_customer',
    args: {'style_template': style_template, 'style_field': d.style_field, 'style_name': d.style_name},
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
})
*/
frappe.ui.form.on('Customer', {
  refresh: function(frm){
    frappe.db.get_value('Selling Settings', {'name': "Selling Settings"}, 'mobile_no' , (r) =>{
        if(r.mobile_no == 1){
          cur_frm.set_value("mobile","Enabled")
        }else{
          cur_frm.set_value("mobile","Disabled")  
      }
  })
  frappe.db.get_value('Selling Settings', {'name': "Selling Settings"}, 'size' , (r) =>{
    if(r.size == 1){
      cur_frm.set_value("size_mandatory","Enabled")
    }else{
      cur_frm.set_value("size_mandatory","Disabled")  
  }
})

  },
  phone: function(frm){
   /* if(frm.doc.phone.length>11){
      frm.doc.phone ='';
      frm.refresh_fields();
      frappe.msgprint("Warning: Mobile No is not allow more than eleven digits")
    }
    console.log("LL" + l)*/
  },
  setup: function(frm, cdt, cdn) {
    frm.fields_dict['measurement_template'].get_query = function() {
        return {
          query: "tailorpad.custom_folder.custom_selling.old_measurement_data",
          filters: {
            'customer': frm.doc.name
          }
      }
    }
    frm.fields_dict['new_measurement_template'].get_query = function() {
        return {
          query: "tailorpad.custom_folder.custom_selling.new_measurement_data",
          filters: {
            'customer': frm.doc.name,
            'item_group':'Bespoke'
            //'measurement_template': 'Body Measurement'
          }
      }
    }
     frm.fields_dict['garment_template'].get_query = function() {
        return {
          query: "tailorpad.custom_folder.custom_selling.old_garment_measurement_data",
          filters: {
            'customer': frm.doc.name
          }
      }
    }
    frm.fields_dict['new_garment_measurement_template'].get_query = function() {
        return {
          query: "tailorpad.custom_folder.custom_selling.new_garment_measurement_data",
          filters: {
            'customer': frm.doc.name,
            'item_group':'Bespoke'
           // 'measurement_template': 'Garment Measurement'
          }
      }
    }
    frm.fields_dict['alteration_template'].get_query = function() {
        return {
          query: "tailorpad.custom_folder.custom_selling.old_alteration_measurement_data",
          filters: {
            'customer': frm.doc.name
          }
      }
    }
    frm.fields_dict['new_alteration_measurement_template'].get_query = function() {
        return {
          query: "tailorpad.custom_folder.custom_selling.new_alteration_measurement_data",
          filters: {
            'customer': frm.doc.name,
            'item_group':'Bespoke'
           // 'measurement_template': 'Alteration Measurement'
          }
      }
    }
    
    frm.fields_dict['style_template'].get_query = function() {
        return {
          query: "tailorpad.custom_folder.custom_selling.old_style_data",
          filters: {
            'customer': frm.doc.name
          }
      }
    }

    frm.fields_dict['available_product_option'].get_query = function() {
      return {
        query: "tailorpad.custom_folder.custom_selling.old_product_data",
        filters: {
          'customer': frm.doc.name
        }
    }
  }

    frm.fields_dict['new_style_template'].get_query = function() {
        return {
          query: "tailorpad.custom_folder.custom_selling.new_style_data",
          filters: {
            'customer': frm.doc.name,
            'item_group':'Bespoke'
          }
      }
    }
    frm.fields_dict['new_product_option'].get_query = function() {
      return {
        query: "tailorpad.custom_folder.custom_selling.new_product_data",
        filters: {
          'customer': frm.doc.name,
          'item_group':'Bespoke'
        }
    }
  }

    frm.fields_dict['styles'].grid.get_field('style_name').get_query = function(frm,cdt,cdn) {
      var child = locals[cdt][cdn];
      var doc = cur_frm.doc;
      return{
        query: "tailorpad.admin.doctype.work_order.work_order.get_style_name",
        filters:{ 'style_field': child.style_field,
        'style_template': doc.style_template,
        'new_style_template': doc.new_style_template
      }
      }
    }

  }
})

frappe.ui.form.on('Customer', 'update_measurement', function(frm){
  var doc = frm.doc;

  if(!doc.measurement_template && !doc.new_measurement_template){
    frappe.throw('Select Measurement Template')
  }

  measurement_template_t = doc.measurement_template || doc.new_measurement_template;

  if(doc.type_of_measurement == 'New'){
    $.each(doc.measurement_fields, function(k,v){
      var mfs = cur_frm.add_child("customer_measurement_data");
      mfs.measurement_template = measurement_template_t;
      mfs.measurement_field = v.measurement_field
      mfs.note = v.note
      mfs.measurement_value = v.measurement_value
      mfs.image = v.image
      mfs.image_html = v.image_html
    })
    refresh_field('measurement_fields')
  }else if(doc.type_of_measurement == 'Update'){
    measurement_set = {}
    $.each(doc.measurement_fields, function(k, v){
      measurement_set[v.measurement_field] = [v.measurement_value, v.image_html, v.note]
    })
    frm.cscript.update_customer_measurement(measurement_set)
  }

  frm.save();
  frappe.msgprint("Updated Successfully")
})

frappe.ui.form.on('Customer', 'update_style', function(frm){
  var doc = frm.doc;
  var style_template = doc.style_template || doc.new_style_template;

  if(!style_template){
    frappe.throw('Select Style Template')
  }
  console.log("unwant")
  if(doc.type_of_style == 'New'){
    $.each(doc.styles, function(k,v){
     /* var mfs = cur_frm.add_child("customer_style_data");
      mfs.style_template = style_template
      mfs.style_field = v.style_field
      mfs.note = v.note
      mfs.style_value = v.style_name
      mfs.image = v.image
      mfs.image_html = v.html_image*/
    })
    refresh_field('customer_style_data')
  }else if(doc.type_of_style == 'Update'){
    measurement_set = {}
    $.each(doc.styles, function(k, v){
      measurement_set[v.style_field] = [v.style_name, v.html_image, v.note, v.style_field, v.image]
    })
    frm.cscript.update_customer_style(measurement_set)
  }

  frm.save();
  frappe.msgprint("Updated Successfully")
})


cur_frm.cscript.update_customer_measurement=function(measurement_set){
  var doc = cur_frm.doc;
  measurement_template_t = doc.measurement_template || doc.new_measurement_template;
  $.each(doc.customer_measurement_data, function(i, data){
    if(data.measurement_template == measurement_template_t && measurement_set[data.measurement_field][0] > 0){
      data.measurement_value = measurement_set[data.measurement_field][0]
      data.note = measurement_set[data.measurement_field][2]
      delete measurement_set[data.measurement_field]
    }
  })

  if(measurement_set){
    $.each(measurement_set, function(field, value){
      var mfs = cur_frm.add_child("customer_measurement_data");
      mfs.measurement_template = measurement_template_t
      mfs.measurement_field = field
      mfs.measurement_value = value[0]
      mfs.html_image = value[0]
    })
  }
}

cur_frm.cscript.update_customer_style=function(measurement_set){
  var doc = cur_frm.doc;
  style_template = doc.style_template || doc.new_style_template;
  $.each(doc.customer_style_data, function(i, data){
    if(data.style_template == style_template && measurement_set[data.style_field]){
     // data.style_value = measurement_set[data.style_field][0]
     // data.image_html = measurement_set[data.style_field][1]
     // data.image = measurement_set[data.style_field][4]
     // data.note = measurement_set[data.style_field][2]
      delete measurement_set[data.style_field]
    } else if(data.style_template == style_template) {
      delete measurement_set[data.style_field]
    }
  })

  if(measurement_set){
    $.each(measurement_set, function(field, value){
     /* mfs = cur_frm.add_child("customer_style_data");
      mfs.style_template = style_template
      mfs.style_field = value[3]
      mfs.style_value = value[0]
      mfs.image_html = value[1]
      mfs.note = value[2]
      mfs.image = value[4]*/
    })
  }
}


frappe.ui.form.on('Customer', {
  attach_front_side: function() {
    refresh_field("front_side");
  },
  attach_back_side: function() {
    refresh_field("back_side");
  },
  delete_available_garment_measurement: function(frm) {
    frappe.garment_confirmation(frm);

  },
  
  delete_available_measurement_template: function(frm) {
      frappe.body_confirmation(frm);
      
  },
  
  
  delete_available_alteration_measurement: function(frm) {
    frappe.alteration_confirmation(frm);
  },
  
  delete_available_style_template: function(frm) {
    frappe.style_confirmation(frm);

  },
  delete_available_product_option: function(frm) {
    frappe.product_confirmation(frm);

  },

})


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

frappe.body_confirmation = function(frm, message, ifyes, ifno) {
	var d = new frappe.ui.Dialog({
		title: __("Confirm"),
		fields: [
			{fieldtype:"HTML", options:`<p class="frappe-confirm-message">${'Do you want to delete available body measurement template?'}</p>`}
		],
		primary_action_label: __("Yes"),
		primary_action: function() {
			if(ifyes) ifyes();
			if(frm.doc.measurement_template) {
      frappe.call({
      method: "tailorpad.custom_folder.custom_selling.delete_templates",
      args: {
        data_type: "Customer Measurement Data", 
        customer: frm.doc.name, 
        template_name: frm.doc.measurement_template
      },
      callback: function() {
        frm.set_value('measurement_template', '');
        frm.set_value('new_measurement_template', '')
        frm.set_value('measurement_fields', '');
        frm.save()
      }
    })
		}
    d.hide();
		},
	//	secondary_action_label: __("No")
		
	});
	d.show();
    d.confirm_dialog = true;
	if(ifno){;
		d.onhide = function() {
			if(!d.primary_action_fulfilled) {
				ifno();
			}
		};
	}
	return d;
}

frappe.garment_confirmation = function(frm, message, ifyes, ifno) {
	var d = new frappe.ui.Dialog({
		title: __("Confirm"),
		fields: [
			{fieldtype:"HTML", options:`<p class="frappe-confirm-message">${'Do you want to delete available garment measurement template?'}</p>`}
		],
		primary_action_label: __("Yes"),
		primary_action: function() {
			if(ifyes) ifyes();
			if(frm.doc.garment_template) {
      frappe.call({
      method: "tailorpad.custom_folder.custom_selling.delete_garment_templates",
      args: {
        data_type: "Garment Measurement Data", 
        customer: frm.doc.name, 
        template_name: frm.doc.garment_template
      },
      callback: function() {
        frm.set_value('garment_template', '');
        frm.set_value('garment_measurement_fields', []);
        frm.set_value('new_garment_measurement_template', '');
        frm.save();
       // frm.reload_doc();
      }
    })
    
	}
    d.hide();
		},
		//secondary_action_label: __("No")
		
	});
	d.show();
    d.confirm_dialog = true;
	if(ifno){;
		d.onhide = function() {
			if(!d.primary_action_fulfilled) {
				ifno();
			}
		};
	}
	return d;
}

frappe.alteration_confirmation = function(frm, message, ifyes, ifno) {
	var d = new frappe.ui.Dialog({
		title: __("Confirm"),
		fields: [
			{fieldtype:"HTML", options:`<p class="frappe-confirm-message">${'Do you want to delete available alteration measurement template?'}</p>`}
		],
		primary_action_label: __("Yes"),
		primary_action: function() {
			if(ifyes) ifyes();
			if(frm.doc.alteration_template) {
      frappe.call({
      method: "tailorpad.custom_folder.custom_selling.delete_alteration_templates",
      args: {
        data_type: "Alteration Measurement Data", 
        customer: frm.doc.name, 
        template_name: frm.doc.alteration_template
      },
      callback: function() {
        frm.set_value('alteration_template', '');
        frm.set_value('alteration_measurement_fields', '');
        frm.set_value('new_alteration_measurement_template', '');
        frm.save();
      //  frm.reload_doc();
      }
    })
    
	}
    d.hide();
		},
		//secondary_action_label: __("No")
		
	});
	d.show();
    d.confirm_dialog = true;
	if(ifno){;
		d.onhide = function() {
			if(!d.primary_action_fulfilled) {
				ifno();
			}
		};
	}
	return d;
}


frappe.style_confirmation = function(frm, message, ifyes, ifno) {
	var d = new frappe.ui.Dialog({
		title: __("Confirm"),
		fields: [
			{fieldtype:"HTML", options:`<p class="frappe-confirm-message">${'Do you want to delete available style measurement template?'}</p>`}
		],
		primary_action_label: __("Yes"),
		primary_action: function() {
			if(ifyes) ifyes();
			if(frm.doc.style_template) {
      frappe.call({
      method: "tailorpad.custom_folder.custom_selling.delete_style_templates",
      args: {
        data_type: "Customer Style Data", 
        customer: frm.doc.name, 
        template_name: frm.doc.style_template
      },
      callback: function() {
        frm.set_value('style_template', '');
        frm.set_value('styles', []);
        frm.set_value('new_style_template', '');
        frm.save();
        //frm.reload_doc();
      }
    })
    
	}
    d.hide();
		},
		//secondary_action_label: __("No")
		
	});
	d.show();
    d.confirm_dialog = true;
	if(ifno){;
		d.onhide = function() {
			if(!d.primary_action_fulfilled) {
				ifno();
			}
		};
	}
	return d;
}

frappe.product_confirmation = function(frm, message, ifyes, ifno) {
	var d = new frappe.ui.Dialog({
		title: __("Confirm"),
		fields: [
			{fieldtype:"HTML", options:`<p class="frappe-confirm-message">${'Do you want to delete available product option?'}</p>`}
		],
		primary_action_label: __("Yes"),
		primary_action: function() {
			if(ifyes) ifyes();
			if(frm.doc.available_product_option) {
      frappe.call({
      method: "tailorpad.custom_folder.custom_selling.delete_product_option",
      args: {
        data_type: "Customer Product Data", 
        customer: frm.doc.name, 
        product_name: frm.doc.available_product_option
      },
      callback: function() {
        frm.set_value('available_product_option', '');
        frm.set_value('products', []);
        frm.set_value('new_product_option', '');
        frm.save();
      }
    })
    
	}
    d.hide();
		},
		
	});
	d.show();
    d.confirm_dialog = true;
	if(ifno){;
		d.onhide = function() {
			if(!d.primary_action_fulfilled) {
				ifno();
			}
		};
	}
	return d;
}




//ChangeStyle = Class.extend({
frappe.ChangeStyle = Class.extend({
//frappe.ui.form.ChangeStyle = Class.extend({
  init: function(args, doc){
    console.log("called" + args)
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
      me.table = $(repl('<div class="section-head"><b>Style Name: %(style)s</b></div>\
       <div class="section-body"><table class="table table-bordered" class="datalist_table"><thead>\
       <tr style="background-color:#D1D1D1"><td>Sr No</td><td>Style Name</td><td>Image</td><td>Cost to Customer</td><td>Select</td></tr>\
       </thead><tbody></tbody></table></div><hr>', {'style': r})).appendTo($(me.div))

        $.each(v, function(i, value){
          $(repl('<tr><td data-value="%(style_field)s">'+(i+1)+'</td><td>%(style_name)s</td>\
             <td><img width="100" src="%(image)s"></td><td>%(cost_to_customer)s</td>\
             <td><input class="check-val" type="radio" name="%(style_field)s" %(is_checked)s></td></tr>', value)).appendTo($(me.table.find('tbody')))
        })
        console.log("DD" + this.div)
    })
   // me.update_style()
  //},
  //update_style: function(){
    var me = this;
    var name_list = ['style_field', 'style_name', 'html_image', 'cost_to_customer']
    var data_list = []
    //primary_action_label: __('Update'){
    this.dialog.set_primary_action(__("Update"), function() {
      var me = this;
      console.log("MMME" + this.div)
    //})
    //this.dialog.$wrapper.find((('table tr')), function(i,tr_value){
      $.each($(this.div.find('table tr')), function(i,tr_value){
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
    console.log("D" + data_list)
    var me = this;
    $.each(data_list, function(key, value){
      $.each(doc.style_fields, function(k,d){
        if(value['style_field'] == d.style_field){
          frappe.model.set_value(d.doctype, d.name, 'style_name', value['style_name'])
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








