// Copyright (c) 2018, Lagan Jaiswal and contributors
// For license information, please see license.txt

//{% include 'erpnext/selling/sales_common.js' %}

frappe.ui.form.on('Sales Order Item', {
  select_raw_materials: function(frm, cdt ,cdn) {
    var row = locals[cdt][cdn];
    var data = row.raw_materials ? JSON.parse(row.raw_materials) : [];
    var dialog = new frappe.ui.Dialog({
      title: __("Select Raw Materials"),
      fields: [
        {fieldtype: "Table", fieldname: "bom_items", label: __("BOM Item"), 
        fields: [
          {
            fieldtype:'Link',
            fieldname:'item_code',
            options: 'Item',
            label: __('Item Code'),
            in_list_view:1,
            columns: 2,
            get_query: function() {
                return {
                  "query": "tailorpad.admin.doctype.sales_form.sales_form.get_rm_items",
                  "filters": {
                        item_code: row.item_code
                    }
                };
            },
            onchange: function(e) {
              var me = this;
              var item_code = this.get_value();
              frappe.call({
                method: "tailorpad.admin.doctype.sales_form.sales_form.get_item_details",
                args: {
                  item_code: item_code
                },
                callback: function(r) {
                  if(r.message) {
                    me.grid_row.on_grid_fields_dict
                      .warehouse.set_value(r.message[1]);
                    me.grid_row.on_grid_fields_dict
                      .supplier.set_value(r.message[0]);
                  }
                } 
              })
            }
          },
          {
            fieldtype:'Link',
            fieldname:'warehouse',
            options: 'Warehouse',
            label: __('Warehouse'),
            in_list_view:1,
            columns: 2
          },
          {
            fieldtype:'Link',
            options: "Supplier",
            fieldname:'supplier',
            label: __('Supplier'),
            in_list_view:1,
            columns: 2
          },
          {
            fieldtype:'Float',
            fieldname:'quantity',
            label: __('Quantity'),
            default: 1,
            in_list_view:1,
            columns: 2
          },
          {
            fieldtype:'Check',
            fieldname:'make_po',
            label: __('Make PO'),
            in_list_view:1,
            default: 0,
            columns: 2
          },
        ],
        in_place_edit: true,
        data: data,
        get_data: function() {
          return data;
        },

        options: "BOM Item", reqd: 0},
      ]
    });

    dialog.set_primary_action(__("Add"), function() {
      var btn = this;
      var values = dialog.get_values();
      frappe.model.set_value(cdt, cdn, 'raw_materials', JSON.stringify(values.bom_items));

      dialog.hide();
    });

    dialog.show();
  }
})


frappe.ui.form.on('Sales Form', {
	refresh: function(frm) {
		frm.disable_save();
    frm.add_fetch('customer', 'attach_front_side', 'attach_front_side');
    frm.add_fetch('customer', 'attach_back_side', 'attach_back_side');
    frm.add_fetch('customer', 'side_view', 'side_view');

    frm.add_custom_button("New Order", function() {
      frm.set_value('customer', '')
      frm.trigger("refresh_field_data")
    }).addClass("btn-primary")

    // frm.add_custom_button("New Customer", function() {
    //   frappe.new_doc("Customer");
    // }).addClass("btn-primary")

    frm.add_fetch("customer", 'phone', 'mobile')
    frm.add_fetch("customer", 'size', 'size')
    frm.add_fetch("customer", 'image', 'image')
    frm.toggle_display("section_break_20", (frm.doc.measurement_template || frm.doc.new_measurement_template))
    frm.toggle_display("section_break_27", (frm.doc.style_template || frm.doc.new_style_template))



    frm.add_custom_button(__('Customer Measurement'), function() {
        var dialog = new frappe.ui.Dialog({
          title: __("Customer Measurement"),
          fields: [
            {fieldtype: "Link", fieldname: "available_measurement_template",
              label: __("Available Measurement Template"),
              reqd: 0, options: "Measurement Template",
              get_query: function() {
                
                return {
                  query: "erpnext.selling.doctype.customer.customer.old_measurement_template",
                  filters: {
                    'customer': frm.doc.customer
                  }
                }
              }
            },
            {fieldtype: "Column Break"},
            {fieldtype: "Link", fieldname: "new_measurement_template",
              label: __("New Measurement Template"), 
              reqd: 0, options: "Measurement Template",
              get_query: function() {
                return {
                  query: "erpnext.selling.doctype.customer.customer.new_measurement_template",
                  filters: {
                    'customer': frm.doc.customer
                  }
                }
              }
            },
          ]
        });

        dialog.show()

        dialog.set_primary_action(__("Make / View"), function() {
          var values = dialog.get_values();
          dialog.hide();
          frappe.call({
            method: "erpnext.selling.doctype.customer.customer.make_customer_measurement",
            args: {
              customer: frm.doc.customer,
              measurement_template: values.available_measurement_template || values.new_measurement_template, 
            },
            callback:function(r) {
              if(r.message) {
                var doc = frappe.model.sync(r.message);
                frappe.set_route("Form", r.message.doctype, r.message.name);
              }
            }
          })  
        })
      }, __("Make"));

      frm.add_custom_button(__('Customer Style'), function() {
        var dialog = new frappe.ui.Dialog({
          title: __("Customer Style"),
          fields: [
            {fieldtype: "Link", fieldname: "available_style_template",
              label: __("Available Style Template"),
              reqd: 0, options: "Style Template",
              get_query: function() {
                return {
                  query: "erpnext.selling.doctype.customer.customer.old_style_template",
                  filters: {
                    'customer': frm.doc.customer
                  }
                }
              }
            },
            {fieldtype: "Column Break"},
            {fieldtype: "Link", fieldname: "new_style_template",
              label: __("New Style Template"), 
              reqd: 0, options: "Style Template",
              get_query: function() {
                return {
                  query: "erpnext.selling.doctype.customer.customer.new_style_template",
                  filters: {
                    'customer': frm.doc.customer
                  }
                }
              }
            },
          ]
        });

        dialog.show()

        dialog.set_primary_action(__("Make / View"), function() {
          var values = dialog.get_values();
          dialog.hide();
          frappe.call({
            method: "erpnext.selling.doctype.customer.customer.make_customer_style",
            args: {
              customer: frm.doc.customer,
              style_template: values.available_style_template || values.new_style_template,
            },
            callback:function(r) {
              if(r.message) {
                var doc = frappe.model.sync(r.message);
                frappe.set_route("Form", r.message.doctype, r.message.name);
              }
            }
          })  
        })
      }, __("Make"));

      frm.page.set_inner_btn_group_as_primary(__("Make"));

	},

	onload: function(frm) {
		frm.set_value('customer', '');

		if(!frm.doc.company) {
			frm.set_value('company', frappe.defaults.get_default("Company"));
		}

		frm.set_value('conversion_rate', 1);
		frm.set_value('price_list_currency', frappe.get_doc(":Company", frm.doc.company).default_currency);
		if(!frm.doc.currency && frm.doc.company) {
			frm.set_value('currency', frappe.get_doc(":Company", frm.doc.company).default_currency);
		}

		if(!frm.doc.transaction_date) {
			frm.set_value('transaction_date', frappe.datetime.now_datetime());
		}

    if(!frm.doc.delivery_date){
      frm.set_value('delivery_date', frappe.datetime.nowdate());
    }

		if(!frm.doc.selling_price_list) {
			frm.set_value('selling_price_list', frappe.defaults.get_default("selling_price_list"));
		}

    if(!frm.doc.taxes_and_charges) {
      return frappe.call({
          method: "erpnext.controllers.accounts_controller.get_default_tax_template",
          args: {
            "master_doctype": "Sales Taxes and Charges Template"
          },
          callback: function(r) {
            console.log(r)
            if(!r.exc) {
              frm.set_value("taxes_template", r.message);
              frm.set_value("taxes_and_charges", r.message);
            }
          }
        });
    }

	},

	currency: function(frm) {
		var company_currency = frappe.get_doc(":Company", frm.doc.company).default_currency;
		frappe.call({
			method: "erpnext.setup.utils.get_exchange_rate",
			args: {
				from_currency: frm.doc.currency,
				to_currency: company_currency,
				transaction_date: frm.doc.transaction_date
			},
			callback: function(r, rt) {
				frm.set_value("conversion_rate", r.message);
			}
		})
	},

	setup: function(frm) {
		frm.fields_dict['measurement_template'].get_query = function() {
        	return {
				query: "tailorpad.custom_folder.custom_selling.old_measurement_data",
				filters: {
					'customer': frm.doc.customer
				}
      		}
    	}

		frm.fields_dict['new_measurement_template'].get_query = function() {
			return {
				query: "tailorpad.custom_folder.custom_selling.new_measurement_data",
				filters: {
					'customer': frm.doc.customer
				}
			}
		}

		frm.fields_dict['style_template'].get_query = function() {
			return {
				query: "tailorpad.custom_folder.custom_selling.old_style_data",
				filters: {
					'customer': frm.doc.customer
				}
			}
		}

		frm.fields_dict['new_style_template'].get_query = function() {
			return {
				query: "tailorpad.custom_folder.custom_selling.new_style_data",
				filters: {
					'customer': frm.doc.customer
				}
			}
		}
	},

	customer: function(frm) {
		frm.trigger("refresh_field_data")
    frappe.call({
      method: "tailorpad.admin.doctype.sales_form.sales_form.get_delivery_days",
      callback: function(r) {
        if(r.message) {
          const delivery_date = frappe.datetime.add_days(frm.doc.transaction_date, r.message)
          frm.set_value('delivery_date', delivery_date)
        }
      }
    })
		
	},

  taxes_template: function(frm) {
    frm.set_value('taxes_and_charges', frm.doc.taxes_template)
    if(!frm.doc.taxes_template) {
      frm.set_value('taxes', [])
      frm.script_manager.trigger("calculate_grand_total_amt");
    }
  },

	new_sales_order: function(frm) {
		frm.set_value('customer', '')
		frm.trigger("refresh_field_data")
	},

	refresh_field_data: function(frm) {
		const fields = ['measurement_template', 'new_measurement_template', 'style_template', 'new_style_template',
			'sales_order', 'sales_invoice', 'mobile', 'customer_name', 'size', 'trial_date']
		fields.forEach(f => frm.set_value(f, ''));

		const so_fields = ['apply_discount_on'];
		so_fields.forEach(f => frm.set_value(f, ''));

		
		const tables = ['items', 'measurement_fields_1', 'styles', 'sales_work_order']
		tables.forEach(f => frm.set_value(f, []));

		const currency_fields = ['total', 'net_total', 'additional_discount_percentage', 'discount_amount',
			'grand_total', 'advance_amount']
		currency_fields.forEach(f => frm.set_value(f, 0.0));				
	},

	submit_sales_order: function(frm) {
		frm.call({
			method: "submit_sales_order",
			doc: frm.doc,
			freeze: true,
			callback: function(r) {
				refresh_field("sales_work_order")
				refresh_field("sales_order")
			}
		})
	},

	submit_sales_invoice: function(frm) {
		frm.call({
			method: "submit_sales_invoice",
			doc: frm.doc,
			freeze: true,
			callback: function(r) {
				refresh_field("sales_invoice")
			}
		})
	}
});

frappe.ui.form.on('Sales Form', 'measurement_template', function(frm){
  doc = frm.doc;

  frm.toggle_display("section_break_20", (frm.doc.measurement_template || frm.doc.new_measurement_template))

  if(doc.measurement_template && doc.customer) {
      frappe.call({
      method: "tailorpad.custom_folder.custom_stock.fetch_customer_measurement",
      args: {'measurement_template': doc.measurement_template, 'parent': doc.customer},
      freeze: true,
      callback: function(r){
          if(r.message){
            cur_frm.set_value('new_measurement_template', '')
            cur_frm.set_value('type_of_measurement', r.message[1])
            cur_frm.clear_table("measurement_fields_1");
            $.each(r.message[0], function(k,v){
              mfs = cur_frm.add_child("measurement_fields_1");
              mfs.measurement_field = v.measurement_field
              mfs.measurement_value = v.measurement_value
              mfs.note = v.note
              mfs.image = v.image
              mfs.image_html = v.image_html
            })
            refresh_field('measurement_fields_1')
          }
      }
    });  
  }
})

frappe.ui.form.on('Sales Form', 'new_measurement_template', function(frm) {
  doc = frm.doc;

  frm.toggle_display("section_break_20", (frm.doc.measurement_template || frm.doc.new_measurement_template))

  if(doc.new_measurement_template && doc.customer) {
      frappe.call({
      method: "tailorpad.custom_folder.custom_stock.fetch_customer_measurement",
      args: {'measurement_template': doc.new_measurement_template, 'parent': doc.customer},
      freeze: true,
      callback: function(r){
          if(r.message){
            cur_frm.set_value('measurement_template', '')
            cur_frm.set_value('type_of_measurement', r.message[1])
            cur_frm.clear_table("measurement_fields_1");
            $.each(r.message[0], function(k,v){
              mfs = cur_frm.add_child("measurement_fields_1");
              mfs.measurement_field = v.measurement_field
              mfs.measurement_value = v.measurement_value
              mfs.note = v.note
              mfs.image = v.image
              mfs.image_html = v.image_html
            })
            refresh_field('measurement_fields_1')
          }
      }
    });
  }
})


frappe.ui.form.on('Sales Form', 'style_template', function(frm){
  doc = frm.doc;
  frm.toggle_display("section_break_27", (frm.doc.style_template || frm.doc.new_style_template))
  if(doc.style_template && doc.customer) {
    frappe.call({
      method: "tailorpad.custom_folder.custom_stock.fetch_customer_style",
      args: {'style_template': doc.style_template, 'parent': doc.customer},
      freeze: true,
      callback: function(r){
          if(r.message){
            cur_frm.set_value('new_style_template', '')
            cur_frm.set_value('type_of_style', r.message[1])
            cur_frm.clear_table("styles");
            $.each(r.message[0], function(k,v){
              mfs = cur_frm.add_child("styles");
              mfs.style_field = v.style_field
              mfs.style_name = v.style_name || v.style_value
              mfs.note = v.note
              mfs.image = v.image
              mfs.html_image = v.html_image || v.image_html
            })
            refresh_field('styles')
          }
      }
    });
  }
})

frappe.ui.form.on('Sales Form', 'new_style_template', function(frm){
  doc = frm.doc;
  frm.toggle_display("section_break_27", (frm.doc.style_template || frm.doc.new_style_template))
  if(doc.new_style_template && doc.customer) {
    frappe.call({
    method: "tailorpad.custom_folder.custom_stock.fetch_customer_style",
    args: {'style_template': doc.new_style_template, 'parent': doc.customer},
    freeze: true,
    callback: function(r){
        if(r.message){
          cur_frm.set_value('style_template', '')
          cur_frm.set_value('type_of_style', r.message[1])
          cur_frm.clear_table("styles");
          $.each(r.message[0], function(k,v){
            mfs = cur_frm.add_child("styles");
            mfs.style_field = v.style_field
            mfs.style_name = v.style_name || v.style_value
            mfs.note = v.note
            mfs.image = v.image
            mfs.html_image = v.html_image || v.image_html
          })
          refresh_field('styles')
        }
    }
  });
  }
  
})








frappe.ui.form.on('Sales Order Item', 'item_code', function(frm, cdt, cdn){
  var d = locals[cdt][cdn];
  if(d.item_code) {
    cur_frm.cscript.calculate_total_amt(frm, cdt, cdn);
  }
  
});

cur_frm.cscript.fabric_qty = function(doc, cdt, cdn){
  cur_frm.cscript.fabric_rate(doc, cdt, cdn)
}

cur_frm.cscript.qty = function(doc, cdt, cdn){
  var d = locals[cdt][cdn]
  cur_frm.cscript.service_rate(doc, cdt, cdn);
  fabric_qty = d.fabric_qty || 1.0;
  frappe.model.set_value(cdt, cdn, 'fabric_qty', flt(fabric_qty * d.qty))
  cur_frm.cscript.fabric_rate(doc, cdt, cdn)
}


cur_frm.cscript.service_rate = function(doc, cdt, cdn){
  var d = locals[cdt][cdn]
  frappe.model.set_value(cdt, cdn, 'total_service_rate', flt(d.qty) * flt(d.service_rate) * doc.conversion_rate)
  cur_frm.cscript.calculate_price_list_rate(doc, cdt, cdn)
}

cur_frm.cscript.fabric_rate = function(doc, cdt, cdn){
  var d = locals[cdt][cdn]
  frappe.model.set_value(cdt, cdn, 'total_fabric_price', flt(d.fabric_qty) * flt(d.fabric_rate) * doc.conversion_rate)
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
  var d = locals[cdt][cdn]
  rate = (flt(d.total_service_rate) + flt(d.total_fabric_price)) / flt(d.qty)
  frappe.model.set_value(cdt, cdn, 'price_list_rate', rate)
}

cur_frm.cscript.calculate_total_amt = function(frm, cdt, cdn){
  var doc = frm.doc;
  var d = locals[cdt][cdn]
  frappe.call({
    method: "tailorpad.custom_folder.custom_item_details.calculate_total_amt",
    args:{
      args: {
        item_code: d.item_code,
        customer: frm.doc.customer,
        qty: d.qty || 1,
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
        plc_conversion_rate: doc.plc_conversion_rate || 1,
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
              if(d.item_group == 'Tailoring') {
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


frappe.ui.form.on('Sales Order Item', 'fabric_item_code', function(frm, cdt, cdn){
  var d = locals[cdt][cdn];
  if(d.fabric_item_code) {
      frappe.call({
        method : "tailorpad.custom_folder.custom_selling.get_supplier",
        args : {'item_code': d.fabric_item_code},
        freeze: true,
        callback: function(r){
          if(r.message){
            frappe.model.set_value('Sales Order Item', d.name, 'fabric_supplier', r.message.default_supplier);
            frappe.model.set_value('Sales Order Item', d.name, 'fabric_warehouse', r.message.default_warehouse);
            d.fabric_qty = 0.0
            if(d.size) {
              frappe.flags.dont_update = true;
              cur_frm.cscript.get_fabric_qty(frm.doc, cdt, cdn)
            } else {
              cur_frm.cscript.calculate_total_amt(frm, cdt, cdn)
            }
          }
        }
      });
    }
});


cur_frm.fields_dict['items'].grid.get_field("fabric_item_code").get_query = function(doc, cdt, cdn) {
  var child = locals[cdt][cdn];
	return {
		query: "tailorpad.custom_folder.custom_selling.get_fabric",
    filters: {
      item_code: child.item_code
    }
	}
}

cur_frm.fields_dict['items'].grid.get_field("alteration_operation").get_query = function(doc, cdt, cdn) {
  return {
    filters: {
      "is_alteration_operation": 1
    }
  }
}

cur_frm.fields_dict['items'].grid.get_field("select_serial_no").get_query = function(doc, cdt, cdn) {
  var child = locals[cdt][cdn];

  return {
    query: "tailorpad.custom_folder.custom_selling.get_completed_serialno"
  }
}

frappe.ui.form.on('Sales Order Item', 'size', function(frm, cdt, cdn){
  cur_frm.cscript.get_fabric_qty(frm.doc, cdt, cdn); 
})

cur_frm.cscript.get_fabric_qty = function(doc, cdt, cdn){
  var d = locals[cdt][cdn];
  if(d.size && d.width)
    frappe.call({
        method: 'tailorpad.custom_folder.custom_selling.get_fabric_qty',
        args: {'parent': d.item_code, 'size': d.size, 'width': d.width},
        freeze: true,
        callback: function(r){
            if(r.message){
              var d = locals[cdt][cdn];
              d.fabric_qty = r.message;
            }
            cur_frm.cscript.calculate_total_amt(cur_frm, cdt, cdn)
        }
    });
}




cur_frm.fields_dict['styles'].grid.get_field('style_name').get_query = function(frm, cdt, cdn) {
  var child = locals[cdt][cdn];
  return{
    query: "tailorpad.admin.doctype.work_order.work_order.get_style_name",
    filters:{ 'style_field': child.style_field}
  }
      
}

frappe.ui.form.on('WO Style Field', 'style_name', function(frm, cdt, cdn){ 
  var d = locals[cdt][cdn]
  style_template = doc.style_template || doc.new_style_template;
  if(d.style_name) {
    frappe.call({
    method: 'tailorpad.admin.doctype.work_order.work_order.get_style_name_data_for_customer',
    args: {'style_template': style_template, 'style_field': d.style_field, 'style_name': d.style_name},
    freeze: true,
    callback: function(r){
      console.log(r.message)
      if(r.message){
        $.each(['note', 'image', 'html_image', 'cost_to_customer'], function(i,d){
            frappe.model.set_value(cdt, cdn, d, r.message[d])
        })
      }
    }
  })
  }
})



erpnext.selling.SalesOrderController = erpnext.selling.SellingController.extend({
	refresh: function(doc, dt, dn) {
		var me = this;
		this._super();
		var allow_purchase = false;
		var allow_delivery = false;
	},

  calculate_grand_total_amt: function(doc) {
    this.calculate_taxes_and_totals();
  }
});

$.extend(cur_frm.cscript, new erpnext.selling.SalesOrderController({frm: cur_frm}));


frappe.ui.form.on('Sales Order Item', {
  items_add: function(frm, cdt , cdn) {
    child = locals[cdt][cdn];
    if(frm.doc.trial_date) {
      frappe.model.set_value(cdt, cdn, 'trial_date', frm.doc.trial_date)
    }
  
    if(frm.doc.delivery_date) {
      frappe.model.set_value(cdt, cdn, 'delivery_date', frm.doc.delivery_date)
    }
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
    debugger
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
      $.each(me.doc.styles, function(k,d){
        if(value['style_field'] == d.style_field){
          frappe.model.set_value(d.doctype, d.name, 'style_name', value['style_name'])
          frappe.model.set_value(d.doctype, d.name, 'cost_to_customer', value['cost_to_customer'])
          frappe.model.set_value(d.doctype, d.name, 'image', value['html_image'])
          frappe.model.set_value(d.doctype, d.name, 'html_image', '<img width="100" src="'+value['html_image']+'">')
        }
      })
    })
    this.dialog.hide()
    refresh_field("styles")
    // cur_frm.save()
  }
})
*/