// Copyright (c) 2025, Shruti Gupta and contributors 
// For license information, please see license.txt


frappe.ui.form.on("AI-Driven Test Case Builder", {
    refresh(frm) {

        frm.add_custom_button(__('Generate Test Cases'), function() {
            frappe.call({
                method: "library_management.library_management.doctype.ai_driven_test_case_builder.ai_driven_test_case_builder.openai_api",
                args: {
                    docname: frm.doc.name,
                    script: frm.doc.script,
                    doc: frm.doc
                },
                callback: function(response) {

                    if (response.message) {
                        frm.set_value("unit_testing_script", response.message.message); // Set the generated test case in the form field
                        frm.refresh_field("unit_testing_script"); // Refresh the field to show the updated value
                        // Optional: Log the full API response for debugging
                        console.log("API Response:", response.message);
                    }
                    else {
                        frappe.msgprint(__('No test cases generated. Please check the script or try again.'));
                        console.error("Error in Test Case Generation:", response);
                    }

                    frappe.call({
                        method: "library_management.library_management.doctype.ai_driven_test_case_builder.ai_driven_test_case_builder.get_test_methods",
                        args: {
                            script: frm.doc.unit_testing_script,
                        },
                        callback: function(response) {
                            const results = response.message;
                            console.log("Test Methods:" + results);
                    
                            // Clear existing rows
                            frm.clear_table("unit_test_execution");
                    
                            //Add each result to the table
                            let index = 1;
                            for (const method_signature in results) {
                                const method_body = results[method_signature];
                        
                                frm.add_child("unit_test_execution", {
                                    test_number: `Test ${index}`,
                                    method_name: method_signature,
                                    code: method_body
                                });
                        
                                index++;
                            }
                    
                            // Refresh the table field to show updated rows
                            frm.refresh_field("unit_test_execution");
                            
                        }
                    }); 
                }
            });
        }, __("Generate Unit Tests"));
    }
});
frappe.ui.form.on('Test Cases Execution', {
    run_test: function (frm, cdt, cdn) {
        const row = locals[cdt][cdn];

        const testCasesScript = frm.doc.unit_testing_script
        const regex = new RegExp(`(\\s*)(${row.method_name.replace(/[.*+?^=!:${}()|\[\]\/\\]/g, "\\$&")})[\\s\\S]*?(?=\\n\\s*def |\\n\\s*\\Z)`, 'g');

        
        const updatedScript = testCasesScript.replace(regex, (match, indentation) => {
            // Ensure the new string matches the indentation level of the original
            return indentation + row.code.split('\n').map(line => indentation + line).join('\n');
          });

        const finalTestCase =   updatedScript.replace(/\bdef\b\s+\bdef\b/, 'def');

        frm.set_value("unit_testing_script", finalTestCase); // Set the generated test case in the form field
        frappe.call({
            method: "library_management.library_management.doctype.ai_driven_test_case_builder.ai_driven_test_case_builder.run_single_test",
            args: {
                script: finalTestCase,  // full script is stored in the parent doc
                method_name: row.method_name       // test method name from that row
            },
            callback: function (response) {
                const result = response.message;

                // Show result as a popup
                frappe.msgprint({
                    title: __('Test Result: ' + row.method_name),
                    message: `<pre>${result.output}</pre>`,
                    indicator: result.wasSuccessful ? 'green' : 'red'
                });

                // Update result + output in row
                row.result = result.wasSuccessful ? "Pass" : "Fail";
                row.code_output = result.output;
                frm.refresh_field("unit_test_execution");
            }
        });
    }
});