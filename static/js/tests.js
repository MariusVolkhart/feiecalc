var runTests = function(tripsColl, settingsColl){ 
    /*
    TODO
    - trip starts on range start, with and without prevoius trip (valid transit day or not for day 1)
    - 0 full day trip with 2 trips on either side, w/ and without overnight transit
    - leap year
    - us territories
    */
    

    // TEST CASES
    var testCases = [{
        
        desc: 'Trip filling entire year',
        
        rangeStart: '2017-01-01',
        trips: [
            ['jp', '2016-12-20', '2018-01-22']
        ],
        
        targetTransitDays: 0,
        targetSum: 365
    
    },{
        
        desc: 'Two trips with 5 invalid days',
        
        rangeStart: '2017-01-01',
        trips: [
            ['fr', '2016-12-20', '2017-06-01'],
            ['it', '2017-06-05', '2018-01-22']
        ],
        
        targetTransitDays: 0,
        targetSum: 360
        
    },{
 
        desc: 'Two trips with 2 transit days',
        
        rangeStart: '2017-01-01',
        trips: [
            ['fr', '2016-12-20', '2017-06-01'],
            ['it', '2017-06-02', '2018-01-22']
        ],
        
        targetTransitDays: 2,
        targetSum: 365
       
    },{
        
        desc: 'Two trips with 1 full day in between (not transit day)',
        
        rangeStart: '2017-01-01',
        trips: [
            ['fr', '2016-12-20', '2017-06-01'],
            ['it', '2017-06-03', '2018-01-22']
        ],
        
        targetTransitDays: 0,
        targetSum: 362
       
    }];
    
    
    if(!tripsColl || !settingsColl){
        console.log('Pass in collections (trips, settings)');return;
    }
    

    // RUN TESTS
    
    testCases.forEach(function(testCase){
        
        // Clear All Trips
        clearTrips(tripsColl);
        
        // Inject New Settings
        settingsColl.setRange(testCase.rangeStart);
        
        // Inject Trips
        var testTrips = expandTestTrips(testCase.trips);
        addTrips(tripsColl, testTrips);
        
        // Calculate Results
        var range = settingsColl.getRange();
        var results = generateTravelResults(moment(range.startDate), moment(range.endDate));
        
        // Validate
        if(results.sum != testCase.targetSum){
            console.log('-----------');
            console.log('TEST FAILED (' + testCase.desc + ')');
            console.log('SUM was (' + results.sum + ') should be (' + testCase.targetSum + ')');
        }
        if(results.transitDays != testCase.targetTransitDays){
            console.log('-----------');
            console.log('TEST FAILED (' + testCase.desc + ')');
            console.log('TRANSIT DAYS was (' + results.transitDays + ') should be (' + testCase.targetTransitDays + ')');
        }
        
    });

};

var expandTestTrips = function(tripsList){
    // Expand from list to dict
    
    var res = [];
    tripsList.forEach(function(thisTrip){
        res.push({
            country: thisTrip[0],
            startDate: thisTrip[1],
            endDate: thisTrip[2],
        });
    });
    return res;
}

