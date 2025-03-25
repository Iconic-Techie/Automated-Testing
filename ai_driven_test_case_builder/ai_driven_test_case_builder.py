# Copyright (c) 2025, Shruti Gupta and contributors
# For license information, please see license.txt

from openai import OpenAI
import frappe
from frappe.model.document import Document
import pandas as pd
import io
import unittest
import sys
import os
import re
# from frappe-bench.sites.test_text_classification_model
# import TestClass


@frappe.whitelist()
def openai_api(docname, doc, script):
    
	client = OpenAI(
    	api_key="enter your api key here",  
	)

	chat_completion = client.chat.completions.create(
    	messages=[
			{"role": "system", "content": "You are software engineer"},
        	{"role": "user", "content": "Here is my python code, Write test cases for it in python. Respond with only the generated code so that I can run it without adjustments. Name the class TestClass(unittest.TestCase)." + script,}
    	],
    	model="gpt-4o-mini",
	)
	
	response = chat_completion.choices[0].message.content
	script = clean_script(response)
	print(response)

	print("Method Pattern::::::::::::::::::::::::::::::::::::::::::: ")
	method_pattern = r"def\s+(\w+)\s*\("
	print(method_pattern)

	method_calls = re.findall(method_pattern, script)
	print("Method method_calls::::::::::::::::::::::::::::::::::::::::::: ")
	print(method_calls)

	file_path = "test_text_classification_model.py"

	with open(file_path, "w") as file:
		file.write(response)

	print(f"Python file '{file_path}' created successfully and the test class code has been added.")
   
	# method_list= ['setup', 'test_training_dataframe', 'test_testing_dataframe', 'test_model_training_and_prediction']

    # return (success, chat gpt generated test cases,method_list)
	return {"status": "Success", "testcase": response, "method_calls": method_calls}

@frappe.whitelist()
def execute_tests(script, function):
	script = clean_script(script)
	before_exec = set(globals().keys())
	print("Execute::::::::::::::::::::::::::::::::::::::::::: ")

	# Execute the provided code
	exec(script, globals())

	print("New Global::::::::::::::::::::::::::::::::::::::::::: ")

	#
	# Capture new functions and classes
	new_globals = {
		name: obj for name, obj in globals().items()
		if name not in before_exec
	}
	# print("Method Pattern::::::::::::::::::::::::::::::::::::::::::: ")
	# method_pattern = r"def\s+(\w+)\s*\("
	# print(method_pattern)

	# method_calls = re.findall(method_pattern, script)
	# print("Method method_calls::::::::::::::::::::::::::::::::::::::::::: ")
	
	# print(method_calls)
	print("Script Start Looping::::::::::::::::::::::::::::::::::::::::::: ")
	result_string = ""
# for function in method_calls:
	if function != "setUp":
		print(f"Function:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::")
		print(f"{function}")
		try:
			print("-----------------------------------------------------")
			test_case = new_globals["TestClass"]
			test_suite = unittest.TestLoader().loadTestsFromName(f"{test_case.__module__}.{test_case.__name__}.{function}")
			
			# Run the test
			unittest.TextTestRunner().run(test_suite)
			
			print(f"Function Passed:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::")
			# print(f"{function._name_}: PASSED")
			result_string += "\n" + function + ": PASSED"
			# print(result_string)
			print("-----------------------------------------------------")
			
			# test_method = function
		except AssertionError as e:
			result_string += "\n" + function + ": FAILED"
			# print(f"{function._name_}: FAILED ({e})")
			print(f"Function failed:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::") 

	result_string += "\nTest Completed: "
	print(f"Test end----------------------------" +result_string)
	
	return result_string

def clean_script(script):
		script = script.strip()
	
		if script.startswith("```") and script.endswith("```"): 
			script = script[3:-3].strip() 
	
		if script.startswith("python"):
			script = script[len("python"):].lstrip()  # Remove 'python' and leading whitespace
	
		return script
	

class AIDrivenTestCaseBuilder(Document):
	pass