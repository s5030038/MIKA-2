/**
* JS FOR CONNECTING BRISBANE DATABASE TO THE FRONT END
*/


/**
* Function that iterates over the data returned by the Fetch request
*/

function iterateRecords(data) {
	// Log the data to the console so that we can see what is being passed to the function
	console.log("Data returned: "+JSON.stringify(data));
	// Looking at what is returned, we can see that the data records are stored in the results object, which we pull out so we can iterate over each record
	var records = data.results;
	//to iterate over each of the values, we use Object.values - passing it the records and then using forEach to look at each value in the object
	Object.values(records).forEach(value => {
		
		// what other data can we get from the records?
		var subject = value["subject"];
		var location = value["location"];
		var start_datetime = value["start_datetime"];
		var end_datetime = value["end_datetime"];
		var formatteddatetime = value["formatteddatetime"];

		
		// check that we have data for each of the fields we want to display
		if(subject && location && start_datetime) {
				// Use jQuery DOM manipulation to insert a section for each record in the set
				$("#records").append(
					$('<section class="record">').append(
						$('<h2>').text(subject),
						$('<p>').text("Location: "+location),
						$('<p>').text("Start Time: "+start_datetime),
						$('<p>').text("End Time: "+end_datetime),
						$('<p>').text("Formatted Date: "+formatteddatetime)
					)
				);
		}
	});
}

/** 
* When the document has loaded, we will call the API and request some data.
*/
$(document).ready(function() {
	var data = {};
	// set the base URL for the dataset you are connecting to
	const creativeEventsAPIURL = "https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/creative-events/records";
	// define request parameters that can be sent to refine the results. What other parameters could we send for this dataset?
	const requestParams = {
		limit: 20, // the number of records to return
		// **** where: 'subject: "Clock Tower Tour" AND location: "Museum of Brisbane, Brisbane City"' // the subject and location to return records for
		};
	//create a string from the request parameter object that we can add to the end of the API url
	const queryString = new URLSearchParams(requestParams).toString(); //slightly convoluted way to construct the URL but can help to avoid errors in the text
	
	//construct the full API call URl by concatenating the apiURL with the request parameters, the ? indicates there are parameters to come
	const fullURL = creativeEventsAPIURL + "?" + queryString;
	
	console.log("URL: " + fullURL); // log the fullURL for error checking
	
	/**
	* Using fetch, we pass it the fullURL to connect to, 
	* We specify that we want the response to return json - what other response formats can we ask for?
	* We specify a function to process the data that is returned
	* We specify how to deal with errors that occur
	*/
	fetch(fullURL)
		.then(response => response.json())
		.then(data => iterateRecords(data))
		.catch(error => console.error("Error fetching data:", error));
});