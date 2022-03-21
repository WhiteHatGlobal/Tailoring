erpnext.production_order = {
	set_custom_buttons: function(frm) {
		var doc = frm.doc;
		if (doc.docstatus === 1) {

			if (flt(doc.qty) > flt(doc.material_transferred_for_manufacturing)) {
				frm.add_custom_button(__('Start'),
					cur_frm.cscript['Start Manufacturing']);
			}

			if(frm.doc.operations) {
				show_button = false
				frm.doc.operations.forEach((data) => {
					if(data.is_subcontracted) {
						show_button= true
					}
				})

				if(show_button) {
					frm.add_custom_button(__('Subcontract'), cur_frm.cscript['Subcontract']);
				}
			}

			
			frm.add_custom_button(__('Issue Raw Material'), function(){
				erpnext.production_order.issue_raw_material(frm.doc);	
			});
			

			if (doc.status != 'Stopped' && doc.status != 'Completed') {
				frm.add_custom_button(__('Stop'), cur_frm.cscript['Stop Production Order'],
					"icon-exclamation", "btn-default");
			} else if (doc.status == 'Stopped') {
				frm.add_custom_button(__('Re-open'), cur_frm.cscript['Unstop Production Order'],
				"icon-check", "btn-default");
			}
		}

	},
	issue_raw_material: function(doc) {
		frappe.call({
			method: "tailorpad.custom_folder.custom_manufacturing.get_users_wo_operation_data",
			freeze: true,
			args: {
				'production_order': cur_frm.doc.name,
				'item_code': cur_frm.doc.production_item
			},
			callback: function(r) {
				var dialog = new frappe.ui.Dialog({
				title: __("For Operation"),
				fields: [
					{"fieldtype": "Link", "label": __("Operation"), "fieldname": "operation", "options":"Operation",
						"get_query": function () {
							return {
								filters: [
									['Operation', 'name', 'in', r.message]
								]
							}
						} },
						{"fieldtype": "Button", "label": __("Issue Raw Material"), "fieldname": "issue_raw_material", "cssClass": "btn-primary"},
					]
				});

				dialog.fields_dict.issue_raw_material.$input.click(function() {
					var args = dialog.get_values();
					if(!args) return;
					dialog.hide();
					return frappe.call({
						type: "GET",
						method: "tailorpad.custom_folder.custom_manufacturing.issue_raw_material",
						args: {
							"work_order": me.frm.doc.work_order,
							"operation": args.operation
						},
						freeze: true,
						callback: function(r) {
							if(!r.exc) {
								var doc = frappe.model.sync(r.message);
								frappe.set_route("Form", r.message.doctype, r.message.name);
							}
						}
					})
				});
				dialog.show();
		}
	})
		
	},
	calculate_cost: function(doc) {
		if (doc.operations){
			var op = doc.operations;
			doc.planned_operating_cost = 0.0;
			for(var i=0;i<op.length;i++) {
				planned_operating_cost = flt(flt(op[i].hour_rate) * flt(op[i].time_in_mins) / 60, 2);
				frappe.model.set_value('Production Order Operation',op[i].name, "planned_operating_cost", planned_operating_cost);

				doc.planned_operating_cost += planned_operating_cost;
			}
			refresh_field('planned_operating_cost');
		}
	},

	calculate_total_cost: function(frm) {
		var variable_cost = frm.doc.actual_operating_cost ?
			flt(frm.doc.actual_operating_cost) : flt(frm.doc.planned_operating_cost)
		frm.set_value("total_operating_cost", (flt(frm.doc.additional_operating_cost) + variable_cost))
	},

	setup_company_filter: function(frm) {
		var company_filter = function(doc) {
			return {
				filters: {
					'company': frm.doc.company
				}
			}
		}

		frm.fields_dict.fg_warehouse.get_query = company_filter;
		frm.fields_dict.wip_warehouse.get_query = company_filter;
	},

	setup_bom_filter: function(frm) {
		frm.set_query("bom_no", function(doc) {
			if (doc.production_item) {
				return{
					query: "erpnext.controllers.queries.bom",
					filters: {item: cstr(doc.production_item)}
				}
			} else msgprint(__("Please enter Production Item first"));
		});
	},

	set_default_warehouse: function(frm) {
		frappe.call({
			method: "erpnext.manufacturing.doctype.production_order.production_order.get_default_warehouse",

			callback: function(r) {
				if(!r.exe) {
					frm.set_value("wip_warehouse", r.message.wip_warehouse);
					frm.set_value("fg_warehouse", r.message.fg_warehouse)
				}
			}
		});
	}
}


cur_frm.cscript['Subcontract'] = function() { 
	var doc = cur_frm.doc;
	operations = []

	cur_frm.doc.operations.forEach((data) => {
		if(data.is_subcontracted) {
			operations.push(data.operation)
		}
	})

	// if(operations.length === 1) {
	// 	operation = operations[0]
	// 	cur_frm.cscript.make_po_for_operation(operation);
	// } else {
		sub_dialog = new frappe.ui.Dialog({
		width: 1200,
		title: __("Subcontracted Operations"),
			fields: [
				{fieldtype: "Select", fieldname: "operation", label: __("Operation"), reqd: 1, options: operations},
				{fieldtype: "Link", fieldname: "supplier", label: __("Supplier"), reqd: 1, options: "Supplier"},
			]
		})

		sub_dialog.show()
		sub_dialog.set_primary_action(__("Make Purchase Prder"), () => {
			var dialog_data = sub_dialog.get_values();
			var operation = dialog_data['operation'];
			var supplier = dialog_data['supplier'];
			cur_frm.cscript.make_po_for_operation(operation, supplier)
		})
	// }
}

cur_frm.cscript.make_po_for_operation = function(operation, supplier) {
	return frappe.call({
		method: "tailorpad.custom_folder.custom_manufacturing.make_purchase_for_subcontract",
		args: {
			'production_order': cur_frm.doc.name,
			'operation': operation,
			'company': cur_frm.doc.company,
			'supplier': supplier
		},
		callback: function(r) {
			if(r.message){
				var doc = frappe.model.sync(r.message);
				frappe.set_route("Form", r.message.doctype, r.message.name);
			}
		}
	})
}


cur_frm.cscript['Start Manufacturing'] = function() {
	frappe.call({
		method: "tailorpad.custom_folder.custom_manufacturing.get_manufacturing_process",
		freeze: true,
		args: {
			'production_order': cur_frm.doc.name,
			'work_order': cur_frm.doc.work_order,
			'item_code': cur_frm.doc.production_item
		},
		callback: function(r) {
			if(r.message){
				msg = r.message;
				if(msg.latest_operation) {
					cur_frm.cscript.make_manufacturing_modal(msg.operations, msg.operation_info, msg.latest_operation, msg);
				} else {
					frappe.throw("Operations in this branch is completed or dependent operations are running")
				}
			}
		}
	})
}

cur_frm.cscript.make_manufacturing_modal = function(operations, args, latest_operation, obj) {
	operations_key = Object.keys(operations);
	trial_qc_data = obj.opt_trial_qc
	dialog = new frappe.ui.Dialog({
		width: 1200,
		title: __("Operation Allotment"),
		fields: [
			{fieldtype: "Select", fieldname: "operation", label: __("Operation"), reqd: 1, options: operations_key, default:latest_operation},
			{fieldtype: "Data", read_only:1, fieldname: "trial_no", label: __("Trial"), default: trial_qc_data[latest_operation] && trial_qc_data[latest_operation]['trials'] ? 1:''},
			{fieldtype: "Link", fieldname: "employee", label: __("Employee"), 
				options:"Employee",
				get_query: function() {
					var dialog_data = dialog.get_values()
					return {
						query: "tailorpad.custom_folder.custom_manufacturing.get_employees",
						filters: {
							item_code: cur_frm.doc.production_item,
							operation: dialog_data.operation
						}
					};	
				},
				onchange:function(e) {
					employee = this.get_value();
					hours = 0;

					if(obj.employees[employee][dialog_values.operation]) {
						hours = obj.employees[employee][dialog_values.operation]["operation_time"]
					}
					if(hours) {
						hours = flt(hours/60, 2);
					}

					dialog.set_value("hours", hours);
					dialog.set_value("completed_serial_no", cur_frm.doc.serial_no);

					update_qty(cur_frm.doc.serial_no)

					update_hours()
				}
			},
			{fieldtype: "Data", fieldname: "item_name", label: __("Item Name"), reqd: 1, default: cur_frm.doc.production_item},
			{fieldtype: "Column Break"},
			{fieldtype: "Datetime", fieldname: "start_date", label: __("Start Date"), reqd: 1, default: frappe.datetime.now_datetime()},
			{fieldtype: "Data", read_only:1, fieldname: "quality_check", label: __("Quality Check")},
			{fieldtype: "Float", fieldname: "hours", label: __("Hours")},
			{fieldtype: "Datetime", fieldname: "end_date", label: __("End Date"), reqd: 1, default: frappe.datetime.now_datetime()},
			{fieldtype: "Section Break"},
			{fieldtype: "Select", fieldname: "serial_no", label: __("Serial No"), options:cur_frm.doc.serial_no.split('\n')},
			{fieldtype: "Check", fieldname: "select_all", label: __("Select All")},
			{fieldtype: "Small Text", fieldname: "completed_serial_no", label: __("Serial Nos")},
			{fieldtype: "Section Break"},
			{fieldtype: "Currency", fieldname: "piece_rate", label: __("Piece Rate")},
			{fieldtype: "Currency", fieldname: "wages", label: __("Wages")},
			{fieldtype: "Currency", fieldname: "extra_cost", label: __("Extra Cost")},
			{fieldtype: "Column Break"},
			{fieldtype: "Currency", fieldname: "style_cost", label: __("Style Cost")},
			{fieldtype: "Currency", fieldname: "total_style_cost", label: __("Total Style Cost")},
			{fieldtype: "Currency", fieldname: "trial_cost", label: __("Trial Cost")},
			{fieldtype: "Section Break"},
			{fieldtype: "Button", fieldname: "assign", label: __("Assign")},
			{fieldtype: "Column Break"},
			{fieldtype: "Button", fieldname: "complete", label: __("Complete")},
		]
	})

	var fd = dialog.fields_dict;
	var dialog_values = dialog.get_values()
	dialog.show()

	if(args && args[dialog_values.operation]) {
		dialog.set_values(args[dialog_values.operation])
	}

	if(!dialog_values.quality_check && trial_qc_data) {
		qc = trial_qc_data[dialog_values.operation]['trials']
		qc_values = qc &&  qc[dialog_values.trial_no]? qc[dialog_values.trial_no]['quality_check'] : ''
		dialog.set_value('quality_check', qc_values == 'checked'?'Yes': 'No')
	}

	if(!dialog_values.hours && !args[dialog_values.operation]) {
		update_qty(dialog_values.completed_serial_no)
	}

	$(fd.serial_no.input).change(function() {
		val = fd.completed_serial_no.$input.val()
		if(val) {
			val += '\n' + $(this).val()
		} else {
			val = $(this).val()
		}

		fd.completed_serial_no.$input.val(val)
		update_qty(val)
	})

	// $(fd.employee.input).change(function() {
		
	// 	employee = $(this).val();
	// 	hours = 0;

	// 	if(obj.employees[employee][dialog_values.operation]) {
	// 		hours = obj.employees[employee][dialog_values.operation]["operation_time"]
	// 	}
	// 	if(hours) {
	// 		hours = flt(hours/60, 2);
	// 	}

	// 	fd.hours.$input.val(hours)

	// 	serial_no_val = cur_frm.doc.serial_no
	// 	fd.completed_serial_no.$input.val(serial_no_val)
	// 	update_qty(serial_no_val)

	// 	update_hours()

	// })

	$(fd.select_all.input).change(function() {
		val = ""
		if(this.checked) {
			val = cur_frm.doc.serial_no
		}

		fd.completed_serial_no.$input.val(val)
		update_qty(val)
	})

	function update_qty(val){
		var dialog_values = dialog.get_values()
		serial_no = val ? val.split('\n') : []
		sno_list = []
		for(key in serial_no) {
			sno = serial_no[key]
			if(sno) {
				sno_list.push(sno)
			}
		}

		qty = sno_list.length || 0;
		employee_data = obj.employees[dialog_values.employee];
		hours = employee_data ? employee_data[dialog_values.operation]["operation_time"] : 0.0;
		if(hours>0) {
			hours = flt(hours/60, 2);
		}
		total_hrs = flt(qty * hours, 2)
		if(total_hrs == 0){ return;}
		fd.hours.$input.val(total_hrs)
		piece_rate = employee_data ? employee_data[dialog_values.operation]["wage"] : 0.0;
		style_cost = obj.style_cost[dialog_values.operation] || 0.0
		if(trial_qc_data && dialog_values.trial_no) {
			trial_cost = flt(trial_qc_data[dialog_values.operation]['trials'][dialog_values.trial_no]["cost"])
			fd.trial_cost.$input.val(trial_cost)
		}

		fd.piece_rate.$input.val(piece_rate)
		fd.wages.$input.val(qty * piece_rate)
		fd.style_cost.$input.val(style_cost)
		fd.total_style_cost.$input.val(qty * style_cost)
		update_hours()
	}

	function update_hours() {
		from_time = frappe.datetime.user_to_str(fd.start_date.$input.val());
		from_time = moment(from_time)
		hours = flt(fd.hours.$input.val());
		from_time.add(hours, "hours");
		dialog.set_value('end_date', from_time.format(moment.defaultDatetimeFormat))
	}

	$(fd.hours.input).change(function() {
		update_hours()
	})

	$(fd.operation.input).change(function() {
		now_time = moment();
		hours = flt(operations[dialog_values.operation] / 60, 2) || 0.1;
		dialog.fields_dict.start_date.$input.val(now_time.format(moment.defaultDatetimeFormat))
		dialog.fields_dict.hours.$input.val(hours)
		now_time.add(hours, "hours");
		dialog.set_value('end_date', now_time.format(moment.defaultDatetimeFormat))
	})

	$(fd.assign.input).click(function() {
		var dialog_values = dialog.get_values();
		frappe.call({
			method:"tailorpad.custom_folder.custom_manufacturing.assign_serial_no_to_employee",
			args:{
				"args": dialog_values,
				'production_order': cur_frm.doc.name,
				'item_code': cur_frm.doc.production_item,
				'work_order': cur_frm.doc.work_order
			},
			callback: function() {
				frappe.msgprint(__("Successfully Assigned"));
				cur_frm.reload_doc()
				dialog.hide()
			}
		})
	})

	$(fd.complete.input).click(function() {
		var dialog_values = dialog.get_values();
		frappe.call({
			method:"tailorpad.custom_folder.custom_manufacturing.complete_serial_no_to_employee",
			args:{
				"args": dialog_values,
				'production_order': cur_frm.doc.name,
				'item_code': cur_frm.doc.production_item,
				'work_order': cur_frm.doc.work_order
			},
			callback: function() {
				frappe.msgprint(__("Successfully Completed"));
				cur_frm.reload_doc()
				dialog.hide()
			}
		})
	})
}