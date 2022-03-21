frappe.ui.form.on('Trial Detail', {
	close_current_trial: function(frm, cdt, cdn) {
		var child = locals[cdt][cdn]
		if(child.trial_status != 'Closed') {
			var next_idx = cint(child.idx) + 1
			return frappe.call({
				method: "transfer_material",
				doc: frm.doc,
				args: {
					idx: next_idx
				},
				callback: function() {
					frappe.model.set_value(cdt, cdn, 'trial_status', 'Closed')
					frm.refresh();
				}
			})
		} else {
			frappe.throw("Already closed fit session")
		}
	},

	trials_add: function(frm,cdt,cdn){
		var child = locals[cdt][cdn];
		var l = frm.doc.trials.length - 1;
		frm.call({
			method: "add_trials",
			doc: frm.doc,
			callback: function() {
			}
		})

	},

	update_work_order: function(frm, cdt, cdn) {
		var child = locals[cdt][cdn];
	//	var wo = cur_frm.copy_doc(frm.doc.work_order);
		frappe.call({
			method: "tailorpad.admin.doctype.fit_session.fit_session.make_work_order",
			args: {
				source_name: frm.doc.name,
				trial_name: child.name
			},
			callback: function(r) {
				if(r.message) {
					//cur_frm.copy_doc(frm.doc.work_order)
					//var doclist = cur_frm.copy_doc(frm.doc.work_order);
					var doclist = frappe.model.sync(r.message);
					frappe.set_route("Form", doclist[0].doctype, doclist[0].name);
					//frappe.set_route("Form", "Work Order", r.message[0].name);

				}
			}
		});
	}
})

frappe.ui.form.on('Fit Session', {
	refresh: function(frm,cdt,cdn) {
		console.log(frm.doc.trial_date);
		for(var i = 0;i<frm.doc.trials.length;i++){
			if(!frm.doc.trials[i].fitting_date){
				frm.doc.trials[i].fitting_date = frm.doc.trial_date
			}
		}

		if(frm.doc.po_operation == "Yes"){
			unhide_field("update_work_order");
			unhide_field("close_all_trials");
		}
		else{
			hide_field("update_work_order");
			hide_field("close_all_trials");
		}
		if(frm.doc.production_order && frm.doc.status == "Open" && frm.doc.po_operation && frm.doc.po_operation == "Yes"){
			wo_set_css(frm);
			trial_set_css(frm);
			cur_frm.set_df_property("trials", "read_only", 0);
		}
		else{
			cur_frm.set_df_property("trials", "read_only", 1);
		}

		if(frm.doc.status == 'Closed') {
			frm.set_df_property("close_all_trials", "read_only", 1);
			frm.set_df_property("trials", "read_only", 1);
			var operation = frappe.meta.get_docfield("Trial Detail", "operation", frm.doc.name);
			operation.read_only = 1;
			var start_time = frappe.meta.get_docfield("Trial Detail", "start_time", frm.doc.name);
			start_time.read_only = 1;
			var end_time = frappe.meta.get_docfield("Trial Detail", "end_time", frm.doc.name);
			end_time.read_only = 1;
			var update_work_order = frappe.meta.get_docfield("Trial Detail", "update_work_order", frm.doc.name);
			update_work_order.read_only = 1;
			var open = frappe.meta.get_docfield("Trial Detail", "open", frm.doc.name);
			open.read_only = 1;
		}
	},
	close_all_trials: function(frm) {
		frm.call({
			method: "closed_all_trials",
			doc: frm.doc,
			callback: function() {
				frm.reload_doc();
				frappe.msgprint("Closed all trials.")
			}
		})
	},
	update_work_order: function(frm, cdt, cdn) {
		var child = locals[cdt][cdn];
	//	var wo = cur_frm.copy_doc(frm.doc.work_order);
		frappe.call({
			method: "tailorpad.admin.doctype.fit_session.fit_session.make_work_order",
			args: {
				source_name: frm.doc.name,
				trial_name: child.name
			},
			callback: function(r) {
				if(r.message) {
					console.log("RR" + r.message)
					//var a = "WO-00308";
					//a.copy_doc()
					//cur_frm.copy_doc(frm.doc.work_order)
					//var doclist = cur_frm.copy_doc(frm.doc.work_order);
					var doclist = frappe.model.sync(r.message);
					//console.log(r.message[0].name)
					frappe.set_route("Form", doclist[0].doctype, doclist[0].name);
					//frappe.set_route("Form", "Work Order", r.message[0].name);

				}
			}
		});
	}

})

var trial_set_css = function(frm){
		 		document.querySelectorAll("[data-fieldname='close_all_trials']")[1].style.padding = "5px";
				document.querySelectorAll("[data-fieldname='close_all_trials']")[1].style["font-size"] = "12px";
				document.querySelectorAll("[data-fieldname='close_all_trials']")[1].style["line-height"] = "1.5";
				document.querySelectorAll("[data-fieldname='close_all_trials']")[1].style["border-radius"] = "3px";
				document.querySelectorAll("[data-fieldname='close_all_trials']")[1].style["border-color"] = "#444bff";
				document.querySelectorAll("[data-fieldname='close_all_trials']")[1].style.backgroundColor = "#5e64ff";
				document.querySelectorAll("[data-fieldname='close_all_trials']")[1].style.color = "#fff";
   
}

var wo_set_css = function(frm){
		   document.querySelectorAll("[data-fieldname='update_work_order']")[1].style.padding = "5px";
		   document.querySelectorAll("[data-fieldname='update_work_order']")[1].style["font-size"] = "12px";
		   document.querySelectorAll("[data-fieldname='update_work_order']")[1].style["line-height"] = "1.5";
		   document.querySelectorAll("[data-fieldname='update_work_order']")[1].style["border-radius"] = "3px";
		   document.querySelectorAll("[data-fieldname='update_work_order']")[1].style["border-color"] = "#444bff";
		   document.querySelectorAll("[data-fieldname='update_work_order']")[1].style.backgroundColor = "#5e64ff";
		   document.querySelectorAll("[data-fieldname='update_work_order']")[1].style.color = "#fff";

}

