// Copyright (c) 2025, Shruti Gupta and contributors
// For license information, please see license.txt

// frappe.ui.form.on("AI-Driven Test Case Builder", {
// 	refresh(frm) {

// 	},
// });
frappe.ui.form.on("AI-Driven Test Case Builder", {
    refresh(frm) {
        let apiResponse;
       frm.add_custom_button(__('Generate Test Cases'), function() {
        //    let apiResponse; // Declare a variable to store the response object

           frappe.call({
               method: "library_management.library_management.doctype.ai_driven_test_case_builder.ai_driven_test_case_builder.openai_api",
               args: {
                   docname: frm.doc.name,
                   script: frm.doc.script,
                   doc: frm.doc
               },
               callback: function(response) {
                   apiResponse = response; // Save the response object in the variable
                   if (response.message) {
                       frm.doc.unit_testing_script = response.message.testcase;
                       frm.reload_doc();  
                   }
               }
           });
       }, __("Generate Unit Tests"));

       frm.add_custom_button(__('Run Single Unit Tests'), function() {
                   frappe.call({
                    method: "library_management.library_management.doctype.ai_driven_test_case_builder.ai_driven_test_case_builder.execute_tests",
                    args: {
                        script: frm.doc.unit_testing_script,                        
                        function: apiResponse.message.method_calls[1],
                    },
                    callback: function(response) {
                        console.log("TESTING RESPONSE:", response.message);
                    }
                });
    }, __("Generate Unit Tests"));
    },
});