cur_frm.fields_dict['items'].grid.get_field("fabric_item_code").get_query = function(doc, cdt, cdn) {
	return {
		query: "tailorpad.custom_folder.custom_selling.get_fabric"
	}
}

// cur_frm.cscript.size = function(doc, cdt, cdn){ cur_frm.cscript.get_fabric_qty(doc, cdt, cdn); }
//
// cur_frm.cscript.get_fabric_qty = function(doc, cdt, cdn){
//   var d = locals[cdt][cdn]
//   if(d.size && d.width)
//     frappe.call({
//         method: 'tailorpad.custom_folder.custom_selling.get_fabric_qty',
//         args: {'parent': d.item_code, 'size': d.size, 'width': d.width},
//         freeze: true,
//         callback: function(r){
//             if(r.message){
//               frappe.model.set_value('Quotation Item', d.name, 'fabric_qty', r.message.fabric_qty)
//             }
//         }
//     })
// }

frappe.ui.form.on('Quotation Item', 'item_code', function(frm, cdt, cdn){
    cur_frm.cscript.calculate_total_amt(frm, cdt, cdn)
});
/*
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
              total_fabric_price: item.total_fabric_price,
              total_service_rate: item.total_service_rate,
              order_type: frm.doc.order_type,
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
            }

            refresh_field('items')
          }
        });
}
*/
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
              frappe.model.set_value('Quotation Item', d.name, 'fabric_qty', r.message)
              cur_frm.cscript.calculate_total_amt(cur_frm, cdt, cdn)
            }
        }
    });
}

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
	console.log(d.fabric_qty)
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
