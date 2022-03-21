frappe.ui.form.on("Purchase Order", {
  refresh: function(frm){
      console.log("called")
    if(frm.doc.docstatus==1){
      frm.add_custom_button(__("Send PO to supplier"),
        function(){
          frappe.confirm(__("Are you sure want to send email to supplier?"),
  					function() {
  						frm.trigger("send_po_to_supplier")
  					}
  				);
        })
    }
  },

  send_po_to_supplier: function(frm){
    if(frm.doc.email_id && frm.doc.message_for_supplier){
      frappe.call({
        method: "tailorpad.custom_folder.custom_buying.send_email_to_supplier",
        freeze: true,
        args: {supplier:frm.doc.supplier, email_id: frm.doc.email_id, po_no: frm.doc.name, so_no: frm.doc.sales_order, message: frm.doc.message_for_supplier},
        callback: function(r){
          if(r.message){
            alert("Email sent successfuly")
          }
        }
      })
    }else{
      frappe.throw("Mandatory fields: Email id, Message for Supplier")
    }
  },

  supplier: function(frm){
      if(frm.doc.supplier){
        frm.trigger("get_supplier_email_id")
      }
  },

  get_supplier_email_id: function(frm){
    frappe.call({
      method: "tailorpad.custom_folder.custom_buying.get_supplier_email_id",
      args: {supplier: frm.doc.supplier},
      callback: function(r){
        if(r.message){
          frm.set_value('email_id', r.message)
        }
      }
    })
  },

  on_submit: function(frm){
    frappe.boot.notification_settings.purchase_order = 0;
  }
})
