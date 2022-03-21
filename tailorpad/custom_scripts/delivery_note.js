frappe.ui.form.on('Delivery Note', 'refresh', function(frm, cdt, cdn){
    for(var i = 0;i<frm.doc.items.length;i++){
            //frm.doc.items[i].serial_no = frm.doc.items[i].serial;
    }     
})