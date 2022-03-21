frappe.ui.form.on('Sales Order', 'refresh', function(frm, cdt, cdn){
  frappe.db.get_value('Selling Settings', {name: "Selling Settings"}, 'show_costing_and_profit_details' , (r) =>{
  if(r.show_costing_and_profit_details == "1"){
  cur_frm.toggle_display("total_profit_amount",true);
  cur_frm.toggle_display("total_profit_margin",true);
  cur_frm.toggle_display("total_buying",true);

  }
  else{
    cur_frm.toggle_display("total_profit_amount",false); 
    cur_frm.toggle_display("total_profit_margin",false);
    cur_frm.toggle_display("total_buying",false);
    var res = frappe.meta.get_docfield("Sales Order Item","buying_service", cur_frm.doc.name);
    res.hidden = 1;
    var res = frappe.meta.get_docfield("Sales Order Item","total_buying", cur_frm.doc.name);
    res.hidden = 1;
    var res = frappe.meta.get_docfield("Sales Order Item","total_raw_material_buying", cur_frm.doc.name);
    res.hidden = 1;
    var res = frappe.meta.get_docfield("Sales Order Item","fabric_buying", cur_frm.doc.name);
    res.hidden = 1;
    var res = frappe.meta.get_docfield("Sales Order Item","total_fabric_buying", cur_frm.doc.name);
    res.hidden = 1;
    frm.refresh_fields();
  }
  })

  //for (var i=0;i<cur_frm.doc.items.length;i++){
    //  if(!cur_frm.doc.items[i].fabric_code){
      //  cur_frm.doc.items[i].fabric_code = '';
      //}
  //}
 var today = new Date();
 var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
 var date = (frappe.datetime.nowdate())
 var dateTime = date+' '+time;
 frappe.db.get_value('Selling Settings', {name: "Selling Settings"}, 'delivery_days' , (r) =>{
     var d = frappe.datetime.add_days(dateTime,r.delivery_days)
     var c = d + '' + time;
     if(!frm.doc.delivery){
        frm.set_value('delivery', c);
        frm.set_value('delivery_date',frm.doc.delivery);
}
})
var doc = frm.doc;
if(frm.is_new()) {
  frm.doc.items = [];
}

frm.add_fetch('item_code', 'default_warehouse', 'warehouse');
frm.add_fetch('item_code', 'default_supplier', 'manufacturer_name');


if(doc.docstatus==1){
 // cur_frm.add_custom_button("Work Order", cur_frm.cscript.show_work_order);
  cur_frm.add_custom_button("Serial No", function(){
    frappe.route_options = {
      "sales_order": frm.doc.name
    };
    frappe.set_route("List", 'Serial No');
  });
}
})

frappe.ui.form.on('Sales Order', {
refresh: function(frm){
  frappe.db.get_value('Production Order', {sales_order: frm.doc.name}, 'name' , (r) =>{
    //cur_frm.set_value("production_order",r.name)
  })

  frappe.db.get_value('Selling Settings', {'name': "Selling Settings"}, 'editable_price_list_rate' , (r) =>{
    for (var i = 0;i<frm.doc.items.length;i++){
      if(r.editable_price_list_rate == 1){
        frm.doc.items[i].selling = "Enabled";
      }else{
        frm.doc.items[i].selling = "Disabled";
      }
  }
})
frappe.db.get_value('Selling Settings', {'name': "Selling Settings"}, 'fitting_date' , (r) =>{
  if(r.fitting_date == 1){
    cur_frm.set_value("fitting","Enabled")
  }else{
    cur_frm.set_value("fitting","Disabled")  
}
})

},
items_on_form_rendered : function(frm,grid_row,cdt,cdn) {
  /*
	var grid_row = cur_frm.open_grid_row();
  frappe.db.get_value('Selling Settings', {name: "Selling Settings"}, 'editable_price_list_rate' , (r) =>{
    if(r.editable_price_list_rate == "1"){
		grid_row.grid_form.fields_dict.service_rate.df.read_only = false;
    grid_row.grid_form.fields_dict.buying_service.df.read_only = false;
    grid_row.grid_form.fields_dict.fabric_rate.df.read_only = false;
    grid_row.grid_form.fields_dict.fabric_buying.df.read_only = false;
    grid_row.grid_form.fields_dict.raw_material_rate.df.read_only = false;
    cur_frm.refresh_fields();
    }
    else{
      grid_row.grid_form.fields_dict.service_rate.df.read_only = true;
      grid_row.grid_form.fields_dict.buying_service.df.read_only = true;
      grid_row.grid_form.fields_dict.fabric_rate.df.read_only = true;
      grid_row.grid_form.fields_dict.fabric_buying.df.read_only = true;
      grid_row.grid_form.fields_dict.raw_material_rate.df.read_only = true;
      cur_frm.refresh_fields();
    
    }
  })*/
	},
validate: function(frm){
  var doc = cur_frm.doc;
  let sum = 0;
  for (let i = 0; i < cur_frm.doc.items.length; i++) {
    sum += cur_frm.doc.items[i].total_buying_price;
    if (sum){
    cur_frm.doc.total_buying = sum;
    }
  }
  cur_frm.doc.total_profit_amount = cur_frm.doc.total - cur_frm.doc.total_buying;
  var margin = (cur_frm.doc.total - cur_frm.doc.total_buying)
  var tot_value = margin/cur_frm.doc.total * 100;
  cur_frm.doc.total_profit_margin = tot_value;

}, 
after_save: function(frm){
  frappe.db.get_value('Selling Settings', {name: "Selling Settings"}, 'create_work_order_after_submitting_sales_order' , (r) =>{
    var wo = r.create_work_order_after_submitting_sales_order
  for (var i = 0;i<frm.doc.items.length;i++){
  frappe.call({
    method: "tailorpad.custom_folder.custom_selling.make_work_order",
    args: {'doc': frm.doc.name},
    callback: function(r){
      cur_frm.reload_doc();
      
    }
  
  })
}
  })
},
trial_date: function(frm) {

  $.each(frm.doc.items || [], function(i, d) {
    d.trial_date = frm.doc.trial_date;
  });
  refresh_field("items");
  if(frm.doc.trial_date){
    frm.set_value('fitting_date',frm.doc.trial_date);
      if (frm.doc.trial_date > frm.doc.delivery){
          frm.doc.trial_date ='';
          frm.refresh_fields();
          frappe.msgprint("Warning: Fitting Date cannot be more than Delivery date");
      }
  }
},
delivery: function(frm){
  frm.set_value('delivery_date',frm.doc.delivery);

}
})


cur_frm.cscript.make_purchase_order = function(doc, cdt, cdn){
var doc = cur_frm.doc;
frappe.call({
  method: "tailorpad.custom_folder.custom_selling.get_data",
  args: {'name': doc.name, 'table': 'Purchase Order', 'fields':['name', 'status', 'supplier']},
  freeze: true,
  callback: function(r){
    if(r.message){
               // new showdata_in_dialog_box('Purchase Order', r.message)
    }
  }
})
}
frappe.ui.form.on('Sales Order Item',{
  amount: function(frm,cdt,cdn){
    var child = locals[cdt][cdn];
    var tot = child.amount - child.total_service_rate;
    frappe.model.set_value(cdt, cdn, 'total_fabric_price', tot)
  },

  select_raw_materials: function(frm, cdt ,cdn) {

    var row = locals[cdt][cdn];
    frappe.call({
      method: "tailorpad.custom_folder.custom_stock.raw_material_details",
      args: {
        item: row.item_code
      },
      callback: function(r) {
        if(r.message[0]) {
          var data = row.raw_materials ? JSON.parse(row.raw_materials) : [];
        var data1 = row.raw_item ? JSON.parse(row.raw_item) : [];

          var dialog = new frappe.ui.Dialog({
            title: __("Select Raw Materials"),
            fields: [
              {fieldtype: "Table", fieldname: "bom_items", label: __("Allowed Raw Materials"), 
              fields: [
                {
                  fieldtype:'Link',
                  fieldname:'item',
                  options: 'Item',
                  label: __('Item Code'),
                  in_list_view:1,
                  columns: 2,
                  get_query: function() {
                      return {
                        "query": "tailorpad.custom_folder.custom_stock.get_rm_items",
                        "filters": {
                              item_code: row.item_code,
                          }
                      };
                  },
                  onchange: function() {
                    var me = this;
                    var it = '';
                    var trans_items = dialog.get_values()['bom_items'];
                    for (let i = 0; i < trans_items.length; i++) {
                      it = trans_items[i].item;
                      frappe.db.get_value('Item', {'name': trans_items[i].item}, 'item_name' , (r) =>
                      { 
                        trans_items[i].item_name = r.item_name;
                        dialog.refresh();
                      })
                      frappe.db.get_value('Item', {'name': trans_items[i].item}, 'default_supplier' , (r) =>
                      { 
                        trans_items[i].supplier = r.default_supplier;
                        dialog.refresh();
                      })
                      frappe.db.get_value('Item', {'name': trans_items[i].item}, 'item_sub_group' , (r) =>
                      { 
                        trans_items[i].group = r.item_sub_group;
                        dialog.refresh();
                      })
      
                      frappe.db.get_value('Item Price', {'item_code': trans_items[i].item,'buying':'1'}, 'price_list_rate' , (r) =>{
                        trans_items[i].buying_price = r.price_list_rate;
                        dialog.refresh();
                      })
      
                      frappe.db.get_value('Item Price', {'item_code': trans_items[i].item}, 'price_list_rate' , (r) =>{
                        trans_items[i].raw_rate = r.price_list_rate;
                        var tot = trans_items[i].raw_rate * trans_items[i].quantity;
                        if (tot){
                        trans_items[i].total_price = tot;
                        dialog.refresh();
                        }
                        
                      })

                      if (it){
                        frappe.call({
                          method: "tailorpad.custom_folder.custom_stock.get_item_details",
                          args: {
                            item_code: it,
                            item: row.item_code,
                            size: row.size
                          },
                          callback: function(r) {
                            if(r.message) {
                               var trans_items = dialog.get_values()['bom_items'];
                               if(!trans_items[i].quantity){
                                trans_items[i].quantity = r.message[0];
                                dialog.refresh();
                               }
                            }
                            else{
                              var trans_items = dialog.get_values()['bom_items'];
                              if(!trans_items[i].quantity){   
                              trans_items[i].quantity = "1";
                              dialog.refresh();
                              }
                            }
                          } 
                        })
                      }

                    }
                  }
                },
                {
                  fieldtype:'Data',
                  fieldname:'item_name',
                  label: __('Item Name'),
                  in_list_view:0
                },
                {
                  fieldtype:'Link',
                  fieldname:'group',
                  label: __('Item SubGroup'),
                  options: 'Item Sub Group',
                  in_list_view:1,
                },
                {
                  fieldtype:'Float',
                  fieldname:'quantity',
                  label: __('Quantity'),
                  default: 1,
                  in_list_view:1,
                  onchange: function() {
                    var trans_items = dialog.get_values()['bom_items'];
                    var it = '';
                    for (let i = 0; i < trans_items.length; i++) {
                      it = trans_items[i].item;
                        var tot = trans_items[i].raw_rate * trans_items[i].quantity
                        if (tot){
                        trans_items[i].total_price = tot
                        dialog.refresh();
                        }
                        
                      }
                  }
                },
                
                {
                  fieldtype:'Link',
                  fieldname:'supplier',
                  label: __('Supplier'),
                  options: 'Supplier',
                  in_list_view:0,
                },
                {
                  fieldtype:'Currency',
                  fieldname:'raw_rate',
                  label: __('Selling Price'),
                  in_list_view:1,
                  onchange: function(){
                    var trans_items = dialog.get_values()['bom_items'];
                    var it = '';
                    for (let i = 0; i < trans_items.length; i++) {
                      it = trans_items[i].item;
                        var tot = trans_items[i].raw_rate * trans_items[i].quantity
                        if (tot){
                        trans_items[i].total_price = tot
                        dialog.refresh();
                        }
                        
                      }
                  }
                },
                {
                  fieldtype:'Currency',
                  fieldname:'total_price',
                  label: __('Total Selling Price'),
                  in_list_view:1
                },
                {
                  fieldtype:'Currency',
                  fieldname:'buying_price',
                  label: __('Buying Price'),
                  in_list_view:1
                },
                {
                  fieldtype:'Currency',
                  fieldname:'total_buying',
                  label: __('Total Buying Price'),
                  in_list_view:1
                },
                {
                  fieldtype:'Link',
                  fieldname:'size',
                  label: __('Size'),
                  options:'Size',
                  in_list_view:0,
                  hidden:1
                },
              ],
      
              in_place_edit: true,
              data: data,
              get_data: function() {
                return data;
              },
      
              options: "Allowed Raw Materials", reqd: 0
            },
      
            {fieldtype: "Table", fieldname: "items", label: __("Raw Material Items"), 
            fields: [
              {
                fieldtype:'Link',
                fieldname:'item',
                options: 'Item',
                label: __('Item Code'),
                in_list_view:1,
                columns: 2,
                get_query: function() {
                    return {
                      "query": "tailorpad.custom_folder.custom_stock.raw_items",
                      "filters": {
                            item_code: row.item_code,
                            band: row.band
                        }
                    };
                },
                onchange: function() {
                  var me = this;
                  var it = '';
                  var items = dialog.get_values()['items'];
                  for (let i = 0; i < items.length; i++) {
                    it = items[i].item;
                    dialog.refresh();
                    frappe.db.get_value('Item', {'name': items[i].item}, 'item_name' , (r) =>
                    { 
                      items[i].item_name = r.item_name;
                      dialog.refresh();
                    })
                    frappe.db.get_value('Item', {'name': items[i].item}, 'default_supplier' , (r) =>
                      { 
                        items[i].supplier = r.default_supplier;
                        dialog.refresh();
                      })
                      frappe.db.get_value('Item', {'name': items[i].item}, 'item_sub_group' , (r) =>
                      { 
                        items[i].group = r.item_sub_group;
                        dialog.refresh();
                      })
                    frappe.db.get_value('Item Price', {'item_code': items[i].item,'buying':'1'}, 'price_list_rate' , (r) =>{
                      items[i].buying_price = r.price_list_rate;
                      dialog.refresh();
                    })
      
                    frappe.db.get_value('Item Price', {'item_code': items[i].item}, 'price_list_rate' , (r) =>{
                      items[i].raw_rate = r.price_list_rate;
                      var tot = items[i].raw_rate * items[i].quantity
                      if (tot){
                      items[i].total_price = tot
                      dialog.refresh();
                      }
                      
                    })

                    if (it){
                      frappe.call({
                        method: "tailorpad.custom_folder.custom_stock.get_bomitem_details",
                        args: {
                          item_code: it,
                          item: row.item_code,
                          size:row.size
                        },
                        callback: function(r) {
                          if(r.message) {
                             var items = dialog.get_values()['items'];
                             if (!items[i].quantity){
                              items[i].quantity = r.message[0];
                              dialog.refresh();
                             }
                          }
                          else{
                            var items = dialog.get_values()['items'];
                            if (!items[i].quantity){
                            items[i].quantity = "1";
                            dialog.refresh();
                            }
                          }
                        } 
                      })
                    }

                  }
                }
              },            {
                    fieldtype:'Data',
                    fieldname:'item_name',
                    label: __('Item Name'),
                    in_list_view:0
                  },
                  {
                    fieldtype:'Link',
                    fieldname:'group',
                    label: __('Item SubGroup'),
                    options: 'Item Sub Group',
                    in_list_view:1,
                  },
                  {
                    fieldtype:'Float',
                    fieldname:'quantity',
                    label: __('Quantity'),
                    default: 1,
                    in_list_view:1,
                    onchange: function() {
                    var items = dialog.get_values()['items'];
                    var it = '';
                    for (let i = 0; i < items.length; i++) {
                      it = items[i].item;
                        var tot = items[i].raw_rate * items[i].quantity
                        if (tot){
                        items[i].total_price = tot
                        dialog.refresh();
                        }
                        
                      }
                    }
                  },
                  
                  {
                    fieldtype:'Link',
                    fieldname:'supplier',
                    label: __('Supplier'),
                    options: 'Supplier',
                    in_list_view:0,
                  },
                  {
                    fieldtype:'Currency',
                    fieldname:'raw_rate',
                    label: __('Selling Price'),
                    in_list_view:1,
                    onchange: function(){
                      var items = dialog.get_values()['items'];
                      var it = '';
                      for (let i = 0; i < items.length; i++) {
                        it = items[i].item;
                          var tot = items[i].raw_rate * items[i].quantity
                          if (tot){
                          items[i].total_price = tot
                          dialog.refresh();
                          }
                          
                        }
                    }
                  },
                  {
                    fieldtype:'Currency',
                    fieldname:'total_price',
                    label: __('Total Selling Price'),
                    in_list_view:1
                  },
                  {
                    fieldtype:'Currency',
                    fieldname:'buying_price',
                    label: __('Buying Price'),
                    in_list_view:1
                  },
                  {
                    fieldtype:'Currency',
                    fieldname:'total_buying',
                    label: __('Total Buying Price'),
                    in_list_view:1
                  }
                ],
                in_place_edit: true,
              data: data1,
              get_data: function() {
                return data1;
              },
      
              options: "Raw Material Items", reqd: 0
            
                  },
      
      
      
            ]
          });
      
          dialog.set_primary_action(__("Add"), function() {
            var btn = this;
            let sum = 0;
            let buying_sum = 0;
            var values = dialog.get_values();
            var trans_items = dialog.get_values()['bom_items'];
            if (trans_items){
            for (let i = 0; i < trans_items.length; i++) {
              trans_items[i].total_buying = trans_items[i].buying_price * trans_items[i].quantity
              var tot = trans_items[i].raw_rate * trans_items[i].quantity
              if(tot){
              trans_items[i].total_price = tot
              }
              if (trans_items[i].total_price){
              sum += trans_items[i].total_price;
              }
              if(trans_items[i].total_buying){
              buying_sum += trans_items[i].total_buying;
              }
              if(trans_items[i].item){
              var allowed_raw_materials = trans_items[i].item 
              ? allowed_raw_materials + '\n' + trans_items[i].item  : trans_items[i].item ;
              var result = allowed_raw_materials.slice(10);
              frappe.model.set_value(cdt, cdn, 'allowed_raw_materials', result)
              }
            }
          }
            var items = dialog.get_values()['items'];
            if (items){
            for (let i = 0; i < items.length; i++) {
             items[i].total_buying = items[i].buying_price * items[i].quantity
             var tot = items[i].raw_rate * items[i].quantity
             if(tot){
             items[i].total_price = tot
             }
              if (items[i].total_price){
              sum += items[i].total_price;
              }
              if(items[i].total_buying){
              buying_sum += items[i].total_buying;
              }
              if(items[i].item){
              var allowed_raw_materials = items[i].item 
              ? allowed_raw_materials + '\n' + items[i].item  : items[i].item ;
              var result = allowed_raw_materials.slice(10);
              frappe.model.set_value(cdt, cdn, 'allowed_raw_materials', result)
              }

            }
            }
      
            frappe.model.set_value(cdt, cdn, 'raw_materials', JSON.stringify(values.bom_items));
            frappe.model.set_value(cdt, cdn, 'raw_item', JSON.stringify(values.items));
      
            frappe.model.set_value(cdt, cdn, 'raw_material_rate', sum);
            frappe.model.set_value(cdt, cdn, 'total_raw_material_buying', buying_sum);
            dialog.hide();
          });
      
          dialog.show();
      

        }
        
        else{
          var data = row.raw_materials ? JSON.parse(row.raw_materials) : [];
          var data1 = row.raw_item ? JSON.parse(row.raw_item) : [];  

    var dialog = new frappe.ui.Dialog({
      title: __("Select Raw Materials"),
      fields: [

      {fieldtype: "Table", fieldname: "items", label: __("Raw Material Items"), 
      fields: [
        {
          fieldtype:'Link',
          fieldname:'item',
          options: 'Item',
          label: __('Item Code'),
          in_list_view:1,
          columns: 2,
          get_query: function() {
              return {
                "query": "tailorpad.custom_folder.custom_stock.raw_items",
                "filters": {
                      item_code: row.item_code,
                      band: row.band
                  }
              };
          },
          onchange: function() {
            var me = this;
            var it = '';
            var items = dialog.get_values()['items'];
            for (let i = 0; i < items.length; i++) {
              it = items[i].item;
              dialog.refresh();
              frappe.db.get_value('Item', {'name': items[i].item}, 'item_name' , (r) =>
              { 
                items[i].item_name = r.item_name;
                dialog.refresh();
              })
              frappe.db.get_value('Item', {'name': items[i].item}, 'default_supplier' , (r) =>
                { 
                  items[i].supplier = r.default_supplier;
                  dialog.refresh();
                })
                frappe.db.get_value('Item', {'name': items[i].item}, 'item_sub_group' , (r) =>
                { 
                  items[i].group = r.item_sub_group;
                  dialog.refresh();
                })
              frappe.db.get_value('Item Price', {'item_code': items[i].item,'buying':'1'}, 'price_list_rate' , (r) =>{
                items[i].buying_price = r.price_list_rate;
                dialog.refresh();
              })

              frappe.db.get_value('Item Price', {'item_code': items[i].item}, 'price_list_rate' , (r) =>{
                items[i].raw_rate = r.price_list_rate;
                var tot = items[i].raw_rate * items[i].quantity
                if (tot){
                items[i].total_price = tot
                dialog.refresh();
                }
                
              })

              if (it){
                frappe.call({
                  method: "tailorpad.custom_folder.custom_stock.get_bomitem_details",
                  args: {
                    item_code: it,
                    item: row.item_code,
                    size:row.size
                  },
                  callback: function(r) {
                    if(r.message) {
                       var items = dialog.get_values()['items'];
                       if (!items[i].quantity){
                        items[i].quantity = r.message[0];
                        dialog.refresh();
                       }
                    }
                    else{
                      var items = dialog.get_values()['items'];
                      if (!items[i].quantity){
                      items[i].quantity = "1";
                      dialog.refresh();
                      }
                    }
                  } 
                })
              }

            }
          }
        },            {
              fieldtype:'Data',
              fieldname:'item_name',
              label: __('Item Name'),
              in_list_view:0
            },
            {
              fieldtype:'Link',
              fieldname:'group',
              label: __('Item SubGroup'),
              options: 'Item Sub Group',
              in_list_view:1,
            },
            {
              fieldtype:'Float',
              fieldname:'quantity',
              label: __('Quantity'),
              default: 1,
              in_list_view:1,
              onchange: function() {
                    var items = dialog.get_values()['items'];
                    var it = '';
                    for (let i = 0; i < items.length; i++) {
                      it = items[i].item;
                        var tot = items[i].raw_rate * items[i].quantity
                        if (tot){
                        items[i].total_price = tot
                        dialog.refresh();
                        }
                        
                      }
              }
            },
            
            {
              fieldtype:'Link',
              fieldname:'supplier',
              label: __('Supplier'),
              options: 'Supplier',
              in_list_view:0,
            },
            {
              fieldtype:'Currency',
              fieldname:'raw_rate',
              label: __('Selling Price'),
              in_list_view:1,
              onchange: function(){
                var items = dialog.get_values()['items'];
                var it = '';
                for (let i = 0; i < items.length; i++) {
                  it = items[i].item;
                    var tot = items[i].raw_rate * items[i].quantity
                    if (tot){
                    items[i].total_price = tot
                    dialog.refresh();
                    }
                    
                  }
              }
            },
            {
              fieldtype:'Currency',
              fieldname:'total_price',
              label: __('Total Selling Price'),
              in_list_view:1
            },
            {
              fieldtype:'Currency',
              fieldname:'buying_price',
              label: __('Buying Price'),
              in_list_view:1
            },
            {
              fieldtype:'Currency',
              fieldname:'total_buying',
              label: __('Total Buying Price'),
              in_list_view:1
            }
          ],
          in_place_edit: true,
        data: data1,
        get_data: function() {
          return data1;
        },

        options: "Raw Material Items", reqd: 0
      
            },
      ]
    });

    dialog.set_primary_action(__("Add"), function() {
      var btn = this;
      let sum = 0;
      let buying_sum = 0;
      var values = dialog.get_values();
      var items = dialog.get_values()['items'];
      if (items){
      for (let i = 0; i < items.length; i++) {
       items[i].total_buying = items[i].buying_price * items[i].quantity
       var tot = items[i].raw_rate * items[i].quantity
       if(tot){
       items[i].total_price = tot
       }
        if (items[i].total_price){
        sum += items[i].total_price;
        }
        if(items[i].total_buying){
        buying_sum += items[i].total_buying;
        }
        if (items[i].item){
       var allowed_raw_materials = items[i].item ?allowed_raw_materials + '\n' + items[i].item  : items[i].item ;
       var result = allowed_raw_materials.slice(10);
        frappe.model.set_value(cdt, cdn, 'allowed_raw_materials', result)
        }

      }
      }

      frappe.model.set_value(cdt, cdn, 'raw_item', JSON.stringify(values.items));

      frappe.model.set_value(cdt, cdn, 'raw_material_rate', sum);
      frappe.model.set_value(cdt, cdn, 'total_raw_material_buying', buying_sum);
      dialog.hide();
    });

    dialog.show();


  }
  
  }
    })
  },


raw_material_code: function(frm, cdt, cdn) {
  var child = locals[cdt][cdn];
  frappe.call({
    method: "tailorpad.custom_folder.custom_stock.get_item",
    args: {
      'item_code': child.item_code
    },
    callback: function(r) {
      frappe.model.set_value(cdt, cdn, 'sub_groups', "test")
    }
  })
  if (child.raw_material_code) {
    var allowed_raw_materials = child.allowed_raw_materials 
      ? child.allowed_raw_materials + '\n' + child.raw_material_code : child.raw_material_code;
    frappe.model.set_value(cdt, cdn, 'allowed_raw_materials', allowed_raw_materials)
    frappe.model.set_value(cdt,cdn, 'raw_material_code', '');
    cur_frm.refresh_field('raw_material_code')
  }
  },
item_code: function(frm,cdt,cdn) {
  //var doc = cur_frm.doc;
var d = locals[cdt][cdn];
if(d.item_code) {
  frappe.call({
    method: "tailorpad.custom_folder.custom_stock.cost_to_customer",
    args: {'item_code': d.item_code, 'doc': cur_frm.doc.name, 'customer': cur_frm.doc.customer},
    callback: function(r){
        if(r.message){
          frappe.model.set_value(cdt, cdn, 'cost', r.message[0]);
          //var tot_cal = (flt(d.price_list_rate) + flt(d.style_cost) + flt(d.cost))
          //frappe.model.set_value(cdt,cdn,'amount',tot_cal)

        }
      }
    })
    frappe.call({
      method: "tailorpad.custom_folder.custom_stock.style_cost_to_customer",
      args: {'item_code': d.item_code, 'doc': cur_frm.doc.name, 'customer': cur_frm.doc.customer},
      callback: function(r){
          if(r.message){
            frappe.model.set_value(cdt, cdn, 'style_cost', r.message[0]);
           // var tot_cal = (flt(d.price_list_rate) + flt(d.style_cost) + flt(d.cost))
           // frappe.model.set_value(cdt,cdn,'amount',tot_cal)

          }
        }
      })
  
  frappe.model.set_value(cdt, cdn, 'band', frm.doc.selling_price_list)
  frappe.db.get_value('Customer', {name: frm.doc.customer}, 'size' , (r) =>{
    frappe.model.set_value(cdt, cdn, 'size', r.size)
  })
  frappe.db.get_value('Item Price', {item_code: d.item_code,price_list:d.band}, 'price_list_rate' , (r) =>{
    if(r.price_list_rate){
    frappe.model.set_value(cdt, cdn, 'service_rate', r.price_list_rate)}
    else{
      frappe.model.set_value(cdt, cdn, 'service_rate', "1")
    }
  })
  frappe.db.get_value('Item Price', {item_code: d.item_code,buying: '1',price_list:d.band}, 'price_list_rate' , (r) =>{
    if(r.price_list_rate){
    frappe.model.set_value(cdt, cdn, 'buying_service', r.price_list_rate)
    }
    else{
      frappe.model.set_value(cdt, cdn, 'buying_service', "1")
    }
    var buying = flt(d.buying_service * d.qty);
    if(buying){
    frappe.model.set_value(cdt, cdn, 'total_buying', buying)
    //frappe.model.set_value(cdt, cdn, 'total_buying', flt(d.buying_service * d.qty))
    }
    else{
      frappe.model.set_value(cdt, cdn, 'total_buying', "1")
    }
    frm.doc.total_profit_amount = frm.doc.total - frm.doc.total_buying;
    var margin = (frm.doc.total - frm.doc.total_buying)
    var x = margin/frm.doc.total * 100;
    frm.doc.total_profit_margin = x ;
    
  })
  cur_frm.cscript.calculate_price_list_rate(frm, cdt, cdn)
  //cur_frm.cscript.calculate_total_amt(frm, cdt, cdn);
  }  
var tot_cal = (flt(d.price_list_rate) + flt(d.style_cost) + flt(d.cost))
console.log("Item" + d.amount + d.cost + d.price_list_rate)
console.log("tot"+ tot_cal)
frappe.model.set_value(cdt,cdn,'amount',tot_cal)

}

});

cur_frm.cscript.calculate_total_amt = function(frm, cdt, cdn){
var doc = frm.doc;
var d = locals[cdt][cdn]
frappe.call({
  method: "tailorpad.custom_folder.custom_item_details.calculate_total_amt",
  args:{
    args: {
      item_code: d.item_code,
      customer: frm.doc.customer,
      qty: d.qty,
      fabric_item_code: d.fabric_item_code,
      fabric_qty: d.fabric_qty,
      item_rate: d.price_list_rate,
      service_rate: d.service_rate,
      total_service_rate: d.total_service_rate,
      fabric_rate: d.fabric_rate,
      size: d.size,
      width: d.width,
      total_fabric_price: d.total_fabric_price,
      rate: 0.0,
      amount: 0.0,
      parenttype: doc.doctype,
      parent: doc.name,
      doctype: cdt,
      name: cdn,
      currency: doc.currency,
      conversion_rate: doc.conversion_rate,
      price_list: doc.selling_price_list ||
         doc.buying_price_list,
      price_list_currency: doc.price_list_currency,
      plc_conversion_rate: doc.plc_conversion_rate,
      company: doc.company,
      order_type: doc.order_type,
      is_pos: cint(doc.is_pos),
      is_subcontracted: doc.is_subcontracted,
      transaction_date: doc.transaction_date || doc.posting_date,
      ignore_pricing_rule: doc.ignore_pricing_rule
    }
  },
  callback: function(r){
    $.each(r.message, function(key, val){
      if(key!= 'item_code') {
        frappe.model.set_value(cdt, cdn, key, val)
      }
    })
    cur_frm.cscript.get_item_details(frm, cdt, cdn)
  }
})
}

cur_frm.cscript.get_item_details = function(frm, cdt, cdn) {
var item = locals[cdt][cdn];
var update_stock = 0;
if(['Sales Invoice', 'Purchase Invoice'].includes(frm.doc.doctype)) {
    update_stock = cint(me.frm.doc.update_stock);
    show_batch_dialog = update_stock;

}
return this.frm.call({
        method: "erpnext.stock.get_item_details.get_item_details",
        child: item,
        args: {
          args: {
            item_code: item.item_code,
            barcode: item.barcode,
            serial_no: item.serial_no,
            warehouse: item.warehouse,
            customer: frm.doc.customer,
            supplier: frm.doc.supplier,
            currency: frm.doc.currency,
            update_stock: update_stock,
            conversion_rate: frm.doc.conversion_rate,
            price_list: frm.doc.selling_price_list || frm.doc.buying_price_list,
            price_list_currency: frm.doc.price_list_currency,
            plc_conversion_rate: frm.doc.plc_conversion_rate,
            company: frm.doc.company,
            order_type: frm.doc.order_type,
            total_fabric_price: item.total_fabric_price,
            total_service_rate: item.total_service_rate,
            is_pos: cint(frm.doc.is_pos),
            is_subcontracted: frm.doc.is_subcontracted,
            transaction_date: frm.doc.transaction_date || frm.doc.posting_date,
            ignore_pricing_rule: frm.doc.ignore_pricing_rule,
            doctype: frm.doc.doctype,
            name: frm.doc.name,
            project: item.project || frm.doc.project,
            qty: item.qty || 1,
            stock_qty: item.stock_qty,
            conversion_factor: item.conversion_factor
          }
        },

        callback: function(r) {          
          if(!r.exc) {
            var d = locals[cdt][cdn];
            $.each(r.message, function(k, v) {
              if(!d[k]) d[k] = v;
            });

            frm.script_manager.trigger("price_list_rate", cdt, cdn);
            if(d.item_group == 'Bespoke') {
              frappe.model.set_value(d.doctype, d.name, 'order_type', 'New Order')
            } else if(d.item_group == 'Products') {
              frappe.model.set_value(d.doctype, d.name, 'order_type', 'RTB')
            } else if(d.item_group == 'Services') {
              frappe.model.set_value(d.doctype, d.name, 'order_type', 'Alteration')
            } else {
              frappe.model.set_value(d.doctype, d.name, 'order_type', '')
            }
          }

          refresh_field('items')
        }
      });
}



frappe.ui.form.on('Sales Order Item', {
  band: function(frm, cdt, cdn){
    var child = locals[cdt][cdn];
 /*   child.fabric_item_code = '';
    child.fabric_color = '';
    child.fabric_item_name = '';
    child.width = '';
    child.fabric_item_uom = '';
    child.fabric_pattern = '';
    child.fabric_supplier = '';
    child.fabric_warehouse = '';
    child.fabric_qty = '';
    child.fabric_rate = '';
    child.total_fabric_price = '';
    child.fabric_buying = '';
    child.total_fabric_buying = '';
    frm.refresh_fields();
*/
    frappe.db.get_value('Item Price', {item_code: child.item_code,selling:'1',price_list:child.band}, 'price_list_rate' , (r) =>{
      if(r.price_list_rate){
      frappe.model.set_value(cdt, cdn, 'service_rate', r.price_list_rate)}
      else{
        frappe.model.set_value(cdt, cdn, 'service_rate', "1")
      }
    })
    frappe.db.get_value('Item Price', {item_code: child.item_code,buying:'1',price_list:child.band}, 'price_list_rate' , (r) =>{
      if(r.price_list_rate){
      frappe.model.set_value(cdt, cdn, 'buying_service', r.price_list_rate)
      }
      else{
        frappe.model.set_value(cdt, cdn, 'buying_service', "1")
      }
      var buying = flt(child.buying_service * child.qty);
      if(buying){
      frappe.model.set_value(cdt, cdn, 'total_buying', buying)
      }
      else{
        frappe.model.set_value(cdt, cdn, 'total_buying', "1")
      }
      frm.doc.total_profit_amount = frm.doc.total - frm.doc.total_buying;
      var margin = (frm.doc.total - frm.doc.total_buying)
      var x = margin/frm.doc.total * 100;
      frm.doc.total_profit_margin = x ;
      
    })
  
  },
  item_code: function(frm,cdt,cdn){
    var child = locals[cdt][cdn];
    child.fabric_item_code = '';
    child.fabric_color = '';
    child.fabric_item_name = '';
    child.width = '';
    child.fabric_item_uom = '';
    child.fabric_pattern = '';
    child.fabric_supplier = '';
    child.fabric_warehouse = '';
    child.fabric_qty = '';
    child.fabric_rate = '';
    child.total_fabric_price = '';
    child.fabric_buying = '';
    child.total_fabric_buying = '';
    frm.refresh_fields();
    if(child.work_order_creation){
      frappe.msgprint('Warning: Dont change the item because work order is created. Reload to proceed.');
      cur_frm.reload_doc();
      cur_frm.refresh_fields();
    }
  },
  fabric_item_code:function(frm, cdt, cdn){
  var d = locals[cdt][cdn];
  var doc = cur_frm.doc;
  if(d.fabric_item_code){
    frappe.db.get_value('Bin', {item_code: d.fabric_item_code}, 'actual_qty' , (r) =>{
      frappe.model.set_value(cdt, cdn, 'store_quantity', r.actual_qty)
      
    })
  }
  frappe.db.get_value('Item Price', {item_code: d.fabric_item_code,price_list:d.band}, 'price_list_rate' , (r) =>{
    if(r.price_list_rate){
    frappe.model.set_value(cdt, cdn, 'fabric_rate', r.price_list_rate)
    }else{
      frappe.model.set_value(cdt, cdn, 'fabric_rate', '1')
    }
    })

  if(d.fabric_item_code && d.size && d.width && d.fabric_pattern) {
      frappe.call({
        method: 'tailorpad.custom_folder.custom_selling.get_fabric_qty',
        args: {'parent': d.item_code, 'size': d.size, 'width': d.width, 'pattern': d.fabric_pattern},
        //freeze: true,
        callback: function(r){
            if(r.message){
              var d = locals[cdt][cdn];
              frappe.model.set_value(cdt, cdn, 'fabric_qty', r.message)
              frappe.db.get_value('Item Price', {item_code: d.fabric_item_code,price_list:d.band}, 'price_list_rate' , (r) =>{
              frappe.model.set_value(cdt, cdn, 'fabric_rate', r.price_list_rate)
              })

              frappe.db.get_value('Item Price', {item_code: d.fabric_item_code,'buying':'1',price_list:d.band}, 'price_list_rate' , (r) =>{
                frappe.model.set_value(cdt, cdn, 'fabric_buying', r.price_list_rate)
                frappe.model.set_value(cdt, cdn, 'total_fabric_buying', flt(d.fabric_qty) * flt(d.fabric_buying) * frm.doc.conversion_rate)
              })
            }
            }
        })
    }
    else{
      frappe.model.set_value(cdt, cdn, 'fabric_qty', '1')
      frappe.model.set_value(cdt, cdn, 'fabric_rate', '1')
    }
  },  
  size:function(frm, cdt, cdn){
    var d = locals[cdt][cdn];
    var doc = cur_frm.doc;
    if(d.fabric_item_code && d.size && d.width && d.fabric_pattern) {
        frappe.call({
          method: 'tailorpad.custom_folder.custom_selling.get_fabric_qty',
          args: {'parent': d.item_code, 'size': d.size, 'width': d.width, 'pattern': d.fabric_pattern},
          //freeze: true,
          callback: function(r){
              if(r.message){
                var d = locals[cdt][cdn];
                frappe.model.set_value(cdt, cdn, 'fabric_qty', r.message)
                frappe.db.get_value('Item Price', {item_code: d.fabric_item_code,price_list:d.band}, 'price_list_rate' , (r) =>{
                frappe.model.set_value(cdt, cdn, 'fabric_rate', r.price_list_rate)
                })
  
                frappe.db.get_value('Item Price', {item_code: d.fabric_item_code,'buying':'1',price_list:d.band}, 'price_list_rate' , (r) =>{
                  frappe.model.set_value(cdt, cdn, 'fabric_buying', r.price_list_rate)
                  frappe.model.set_value(cdt, cdn, 'total_fabric_buying', flt(d.fabric_qty) * flt(d.fabric_buying) * frm.doc.conversion_rate)
                })
              }
              }
          })
      }
      else{
        frappe.model.set_value(cdt, cdn, 'fabric_qty', '1')
        frappe.model.set_value(cdt, cdn, 'fabric_rate', '1')
      }
    },  
    fabric_pattern:function(frm, cdt, cdn){
      var d = locals[cdt][cdn];
      var doc = cur_frm.doc;
      if(d.fabric_item_code && d.size && d.width && d.fabric_pattern) {
          frappe.call({
            method: 'tailorpad.custom_folder.custom_selling.get_fabric_qty',
            args: {'parent': d.item_code, 'size': d.size, 'width': d.width, 'pattern': d.fabric_pattern},
            callback: function(r){
                if(r.message){
                  var d = locals[cdt][cdn];
                  frappe.model.set_value(cdt, cdn, 'fabric_qty', r.message)
                  frappe.db.get_value('Item Price', {item_code: d.fabric_item_code,price_list:d.band}, 'price_list_rate' , (r) =>{
                  frappe.model.set_value(cdt, cdn, 'fabric_rate', r.price_list_rate)
                  })
    
                  frappe.db.get_value('Item Price', {item_code: d.fabric_item_code,'buying':'1',price_list:d.band}, 'price_list_rate' , (r) =>{
                    frappe.model.set_value(cdt, cdn, 'fabric_buying', r.price_list_rate)
                    frappe.model.set_value(cdt, cdn, 'total_fabric_buying', flt(d.fabric_qty) * flt(d.fabric_buying) * frm.doc.conversion_rate)
                  })
                }
                }
            })
        }
        else{
          frappe.model.set_value(cdt, cdn, 'fabric_qty', '1')
          frappe.model.set_value(cdt, cdn, 'fabric_rate', '1')
        }
      },  
      
/*
fabric_item_code:function(frm, cdt, cdn){
var d = locals[cdt][cdn];
var doc = cur_frm.doc;
if(d.fabric_item_code) {
    frappe.call({
      method : "tailorpad.custom_folder.custom_selling.get_supplier",
      args : {'item_code': d.fabric_item_code},
      //freeze: true,
      callback: function(r){
        if(r.message){
          frappe.model.set_value('Sales Order Item', d.name, 'fabric_supplier', r.message.default_supplier);
          frappe.model.set_value('Sales Order Item', d.name, 'fabric_warehouse', r.message.default_warehouse);
          d.fabric_qty = 0.0
          if(d.size) {
            frappe.flags.dont_update = true;
            //cur_frm.cscript.get_fabric_qty(frm, cdt, cdn)
          } else {
            //cur_frm.cscript.calculate_total_amt(frm, cdt, cdn)
          }
        }
      }
    });
  }
}*/
});

cur_frm.fields_dict['raw_materials'].grid.get_field("raw_material_code").get_query = function(doc, cdt, cdn) {
  var child = locals[cdt][cdn];
  return {
    query: "tailorpad.custom_folder.custom_stock.get_item",
    filters: {
      item_code: child.parent_item_code
    }
  }
  }

frappe.db.get_value('Selling Settings', {name: "Selling Settings"}, 'filter_fabrics_and_raw_materials_based_on_bespoke_item_price' , (r) =>{
  if(r.bespoke_filter == '1'){
  cur_frm.fields_dict['items'].grid.get_field("fabric_item_code").get_query = function(frm, cdt, cdn) {
  var child = locals[cdt][cdn];
  return {
    filters: {
      'item_group': ['in',['Fabric Sample','Fabric']],
    }
  }
}
}else{
  cur_frm.fields_dict['items'].grid.get_field("fabric_item_code").get_query = function(frm, cdt, cdn) {
  var child = locals[cdt][cdn];
  return {
  query: "tailorpad.custom_folder.custom_selling.get_fabric",
  filters: {
    'item_code': child.item_code,
    'item_group': ['in',['Fabric Sample','Fabric']],
    'band': child.band
  }
}
}
}
})
cur_frm.fields_dict['items'].grid.get_field("alteration_operation").get_query = function(doc, cdt, cdn) {
return {
  filters: {
    "is_alteration_operation": 1
  }
}
}

cur_frm.fields_dict['items'].grid.get_field("raw_material_code").get_query = function(doc, cdt, cdn) {
    var child = locals[cdt][cdn];
return {
  query: "tailorpad.custom_folder.custom_stock.get_rawitem",
  filters: {
      'item': child.item_code,

  }
}
}

cur_frm.fields_dict['items'].grid.get_field("select_serial_no").get_query = function(doc, cdt, cdn) {
var child = locals[cdt][cdn];

return {
  query: "tailorpad.custom_folder.custom_selling.get_completed_serialno"
}
}

frappe.ui.form.on('Sales Order Item', 'quantity', function(frm, cdt, cdn){
  var child = locals[cdt][cdn];
  frappe.model.set_value(cdt, cdn, 'qty', child.quantity);
  })
  frappe.ui.form.on('Sales Order Item', 'qty', function(frm, cdt, cdn){
    var child = locals[cdt][cdn];
    frappe.model.set_value(cdt, cdn, 'quantity', child.qty);
    })
  
frappe.ui.form.on('Sales Order Item', 'size', function(frm, cdt, cdn){
  var doc = cur_frm.doc;
//cur_frm.cscript.get_fabric_qty(frm, cdt, cdn);
})
frappe.ui.form.on('Sales Order Item', 'fabric_pattern', function(frm, cdt, cdn){
  var doc = cur_frm.doc;
  //cur_frm.cscript.get_fabric_qty(frm, cdt, cdn); 
  })

cur_frm.cscript.get_fabric_qty = function(frm, cdt, cdn){
var d = locals[cdt][cdn];
if(d.size && d.width){
  frappe.call({
      method: 'tailorpad.custom_folder.custom_selling.get_fabric_qty',
      args: {'parent': d.item_code, 'size': d.size, 'width': d.width, 'pattern': d.fabric_pattern},
      //freeze: true,
      callback: function(r){
          if(r.message){
            var d = locals[cdt][cdn];
            frappe.model.set_value(cdt, cdn, 'fabric_qty', r.message)
            frappe.db.get_value('Item Price', {item_code: d.fabric_item_code,price_list:d.band}, 'price_list_rate' , (r) =>{
            frappe.model.set_value(cdt, cdn, 'fabric_rate', r.price_list_rate)
            })
            frappe.db.get_value('Item Price', {item_code: d.fabric_item_code,'buying':'1',price_list:d.band}, 'price_list_rate' , (r) =>{
              frappe.model.set_value(cdt, cdn, 'fabric_buying', r.price_list_rate)
              frappe.model.set_value(cdt, cdn, 'total_fabric_buying', flt(d.fabric_qty) * flt(d.fabric_buying) * frm.doc.conversion_rate)
            })
          }
          //cur_frm.cscript.calculate_total_amt(cur_frm, cdt, cdn)
      }
  });
}
else{
           frappe.model.set_value(cdt, cdn, 'fabric_qty', "1")
            frappe.db.get_value('Item Price', {item_code: d.fabric_item_code,price_list:d.band}, 'price_list_rate' , (r) =>{
              if(r.price_list_rate){
                frappe.model.set_value(cdt, cdn, 'fabric_rate', r.price_list_rate)
              }else{
                frappe.model.set_value(cdt, cdn, 'fabric_rate', '1')
              }
            })
}
}

cur_frm.cscript.advance_payment_amount = function(doc, cdt, cdn){
if(flt(doc.advance_payment_amount) > flt(doc.rounded_total)){
  cur_frm.set_value('advance_payment_amount', 0.0)
  alert("Advance payment must be less than sales order amount")
}else if(doc.status == 'Draft'){
  cur_frm.set_value('outstanding_value', flt(doc.rounded_total) - flt(doc.advance_payment_amount))
   cur_frm.set_value('advance_paid', flt(doc.advance_payment_amount))
}
}

cur_frm.cscript.fabric_qty = function(doc, cdt, cdn){
cur_frm.cscript.fabric_rate(doc, cdt, cdn)
}

cur_frm.cscript.quantity = function(doc, cdt, cdn){
  var d = locals[cdt][cdn]
  cur_frm.cscript.calculate_price_list_rate(doc, cdt, cdn)
  var tot_cal = (flt(d.price_list_rate) + flt(d.style_cost) + flt(d.cost))
  frappe.model.set_value(cdt,cdn,'amount',tot_cal)
}
cur_frm.cscript.qty = function(doc, cdt, cdn){
  var d = locals[cdt][cdn]
  cur_frm.cscript.calculate_price_list_rate(doc, cdt, cdn);


cur_frm.cscript.service_rate(doc, cdt, cdn);
var fabric_qty = d.fabric_qty || 1.0;
frappe.model.set_value(cdt, cdn, 'fabric_qty', flt(fabric_qty * d.qty))
cur_frm.cscript.fabric_rate(doc, cdt, cdn)
}

cur_frm.cscript.service_rate = function(doc, cdt, cdn){
var d = locals[cdt][cdn]
frappe.model.set_value(cdt, cdn, 'total_service_rate', flt(d.qty) * flt(d.service_rate) * doc.conversion_rate)
frappe.model.set_value(cdt, cdn, 'total_buying', flt(d.qty) * flt(d.buying_service) * doc.conversion_rate)
doc.total_profit_amount = doc.total - doc.total_buying;
var margin = (doc.total - doc.total_buying)
doc.total_profit_margin = margin/doc.total * 100;
 cur_frm.cscript.calculate_price_list_rate(doc, cdt, cdn)

}

cur_frm.cscript.fabric_rate = function(doc, cdt, cdn){
var d = locals[cdt][cdn]
frappe.model.set_value(cdt, cdn, 'total_fabric_price', flt(d.fabric_qty) * flt(d.fabric_rate) * doc.conversion_rate)
frappe.model.set_value(cdt, cdn, 'total_fabric_buying', flt(d.fabric_qty) * flt(d.fabric_buying) * doc.conversion_rate)
cur_frm.cscript.calculate_price_list_rate(doc, cdt, cdn)
}

cur_frm.cscript.raw_material_rate = function(doc, cdt, cdn){
  var d = locals[cdt][cdn]
  frappe.model.set_value(cdt, cdn, 'total_raw_material_price', flt(d.raw_material_rate) * doc.conversion_rate)
   cur_frm.cscript.calculate_price_list_rate(doc, cdt, cdn)
  }
  

cur_frm.cscript.total_service_rate = function(doc, cdt, cdn){
var d = locals[cdt][cdn]
frappe.model.set_value(cdt, cdn, 'service_rate', (flt(d.total_service_rate) / flt(d.qty)) * doc.conversion_rate)
cur_frm.cscript.calculate_price_list_rate(doc, cdt, cdn)
}

cur_frm.cscript.total_fabric_price = function(doc, cdt, cdn){
var d = locals[cdt][cdn]
frappe.model.set_value(cdt, cdn, 'fabric_rate', (flt(d.total_fabric_price) / flt(d.fabric_qty)) * doc.conversion_rate)
cur_frm.cscript.calculate_price_list_rate(doc, cdt, cdn)
}


cur_frm.cscript.calculate_price_list_rate = function(doc, cdt, cdn){
var doc = cur_frm.doc
var d = locals[cdt][cdn]
frappe.db.get_value('Selling Settings', {name: "Selling Settings"}, 'use_dynamic_pricing' , (r) =>{
if(r.use_dynamic_pricing == 1){
var rate = (flt(d.total_service_rate) + flt(d.total_fabric_price) + flt(d.total_raw_material_price)) / flt(d.qty)
var buying_rate = (flt(d.total_buying) + flt(d.total_fabric_buying) + flt(d.total_raw_material_buying)) / flt(d.qty)
frappe.model.set_value(cdt, cdn, 'price_list_rate', rate)
frappe.model.set_value(cdt, cdn, 'total_buying_price', buying_rate)
let sum = 0;
for (let i = 0; i < doc.items.length; i++) {
  sum += doc.items[i].total_buying;
  doc.total_buying = sum;
}
doc.total_profit_amount = doc.total - doc.total_buying;
var margin = (doc.total - doc.total_buying)
doc.total_profit_margin = margin/doc.total * 100;


}
else{
  var rate = (flt(d.total_service_rate) + flt(d.total_raw_material_price)) / flt(d.qty)
  var buying_rate = (flt(d.total_buying) + flt(d.total_raw_material_buying)) / flt(d.qty)
  frappe.model.set_value(cdt, cdn, 'price_list_rate', rate)
  frappe.model.set_value(cdt, cdn, 'total_buying_price', buying_rate)
  let sum = 0;
  for (let i = 0; i < doc.items.length; i++) {
    sum += doc.items[i].total_buying;
    doc.total_buying = sum;
  }
  doc.total_profit_amount = doc.total - doc.total_buying;
  var margin = (doc.total - doc.total_buying)
  doc.total_profit_margin = margin/doc.total * 100;

}
})
}

cur_frm.cscript.on_submit = function(doc, cdt, cdn) {
if(cint(frappe.boot.notification_settings.sales_order)) {
  cur_frm.email_doc(frappe.boot.notification_settings.sales_order_message);
}
setTimeout(function(){cur_frm.reload_doc()}, 3000)
};

frappe.ui.form.on('Sales Order Item', {
items_add: function(frm, cdt , cdn) {
  var child = locals[cdt][cdn];
  frappe.model.set_value(cdt, cdn, 'trial_date', frm.doc.trial_date)
  frappe.model.set_value(cdt, cdn, 'delivery_date', frm.doc.delivery_date)
},

select_serial_no: function(frm, cdt, cdn) {
  var child = locals[cdt][cdn];

  if(child.select_serial_no) {
      if(child.serial_no) {
        sn = child.serial_no + '\n' + child.select_serial_no;
        frappe.model.set_value(cdt, cdn, 'serial_no', sn)
      } else {
        frappe.model.set_value(cdt, cdn, 'serial_no', child.select_serial_no)
      }
  }
}
})
