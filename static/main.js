'use strict';

var TARGET_COUNT = 330;

var START_DATE = moment('2017-01-01');
var END_DATE = null;

// Models
var TripModel = Backbone.Model.extend();


// Collections
var TripsCollection = Backbone.Collection.extend({
    
    model: TripModel,
    localStorage: new Backbone.LocalStorage('trips')
    
});


var SettingsView = Backbone.View.extend({
    template: _.template($('#template-settings').html()),
    
    events: {
        'change input[data-field=rangeStart]': function(e){
            START_DATE = moment(e.target.value);
            END_DATE = this.calcEndDate(START_DATE);
            var newEndDate = END_DATE.format('YYYY-MM-DD');
            this.$el.find('input[data-field=rangeEnd]').val(newEndDate);
            tripsColl.trigger('change');
        }
    },
    
    initialize: function(options){
        END_DATE = this.calcEndDate(START_DATE);
        this.render();
    },
    
    render: function(){
        this.$el.html(this.template({
            startDate: START_DATE.format('YYYY-MM-DD'),
            endDate: END_DATE.format('YYYY-MM-DD')
        }));
    },
    
    calcEndDate: function(startDate){
        // Doing this so we don't ref the original val
        var sd = moment(startDate.format('YYYY-MM-DD'))
        sd.add(1, 'years');
        sd.subtract(1, 'days');
        return sd;
    }
});

var ResultsView = Backbone.View.extend({
    template: _.template($('#template-results').html()),
    
    events: {},
    
    initialize: function(options){
        this.collection.on('change reset', this.render.bind(this));
    },
    
    render: function(){
        
        // Get Results
        var rawResults = generateTravelResults(START_DATE, END_DATE);
        
        // Build country days list
        var fullDays = 0;
        var countryDays = [];
        _.keys(rawResults.countries).forEach(function(countryCode){
            countryDays.push({
                country: countryByCode(countryCode),
                days: rawResults.countries[countryCode]
            });
            fullDays += rawResults.countries[countryCode];
        });
        countryDays = _.sortBy(countryDays, 'days').reverse();
        
        var transitDays = rawResults.transitDays;
        var totalDays = fullDays + transitDays;
 
        // Progress Bar
        var progress = Math.round(totalDays/TARGET_COUNT*100);
        if(progress>100){
            progress = 100;
        }
        
        this.$el.html(this.template({
            passed: (totalDays>=TARGET_COUNT),
            countryDays: countryDays,
            fullDays: fullDays,
            transitDays: transitDays,
            totalDays: totalDays,
            targetDays: TARGET_COUNT,
            progress: progress
        }));
    }
});

var TripFormView = Backbone.View.extend({
    template: _.template($('#template-trip-form').html()),
    
    events: {
        'click button[data-action=save]': function(e){
            e.preventDefault();
            this.saveTrip();
        },
        'click [data-action=delete]': function(e){
            e.preventDefault();
            this.deleteTrip();
        }
    },
    
    initialize: function(options){
        this.render();
    },
    
    render: function(){
        this.$el.find('.modal-body').html(this.template({
            countries: COUNTRIES
        }));
    },
    
    showTripForm: function(startDate, endDate){
        
        // Clicked a date, maybe an event
        var existingTrip = false;
        if(startDate.format('YYYY-MM-DD') == endDate.format('YYYY-MM-DD')){
            var tripId = freeDate(startDate, true);
            if(tripId){
                existingTrip = tripsColl.get(tripId);
            }else{
                return false;
            }
        }
        
        if(!existingTrip && !freeDateRange(startDate, endDate)){
            alert('Please select a date range not already occupied by another trip');
            return false;
        }
        
        if(existingTrip){
            this.$el.find('.delete-trip').show();
            this.$el.find('[data-field=trip-id]').val(existingTrip.id);
            this.$el.find('[data-field=trip-country]').val(existingTrip.attributes.country).selectpicker('refresh');
            startDate = safeDate(existingTrip.attributes.startDate);
            endDate = safeDate(existingTrip.attributes.endDate);
        }else{
            // New Trip
            this.$el.find('.delete-trip').hide();
            this.$el.find('[data-field=trip-id]').val('');
            this.$el.find('[data-field=trip-country]').val('').selectpicker('refresh');
        }
        
        this.$el.find('[data-field=trip-start-date]').val(startDate.format('YYYY-MM-DD'));
        this.$el.find('[data-field=trip-end-date]').val(endDate.format('YYYY-MM-DD'));
        
        $('#trip-modal').modal('show');
    },

    values: function(){
        return {
            id: this.$el.find('[data-field=trip-id]').val(),
            country: this.$el.find('[data-field=trip-country]').val(),
            startDate: safeDate(this.$el.find('[data-field=trip-start-date]').val()),
            endDate: safeDate(this.$el.find('[data-field=trip-end-date]').val())
        };
    },
    
    validate: function(){
        // Validate the trip details
        
        var values = this.values();
        
        if(!values.country){
            alert('Please select a country');
            return false;
        }
        
        if(!values.startDate._isValid || values.startDate._i.length != 10){
            alert('Please enter a valid start date (format: YYYY-MM-DD)');
            return false;
        }
        
        if(!values.endDate._isValid || values.endDate._i.length != 10){
            alert('Please enter a valid end date (format: YYYY-MM-DD)');
            return false;
        }
        
        if(values.endDate.isBefore(values.startDate)){
            alert('End date must come after start date');
            return false;
        }
        
        // Does this trip overlap with another trip ?
        // TODO
        
        return true;
    },
    
    saveTrip: function(){
        // Save the trip
        
        // Validate it first
        if(!this.validate()){
            return;
        }
        
        var values = this.values();
        
        // Save the trip
        if(values.id){
            var thisTrip = tripsColl.get(values.id);
            thisTrip.set({
                country: values.country,
                startDate: values.startDate,
                endDate: values.endDate
            });
            thisTrip.save();
        }else{
            var thisTrip = new TripModel({
                country: values.country,
                startDate: values.startDate,
                endDate: values.endDate
            });
            tripsColl.add(thisTrip);
            thisTrip.save();
        }
        
        // Close the modal
        this.$el.modal('hide');
        this.$el.find('[data-field=trip-country]').val('').selectpicker('refresh');
        this.$el.find('[data-field=trip-id]').val('');
    },
    
    deleteTrip: function(){
        if(confirm('Are you sure you want to delete this trip?')){
            var tripId = this.$el.find('[data-field=trip-id]').val();
            var thisTrip = tripsColl.get(tripId);
            thisTrip.destroy();
            this.$el.modal('hide');
            tripsColl.trigger('change');
        }
    }
    
});


// Init    

// Load the trips collection
var tripsColl = new TripsCollection();
var tripForm = new TripFormView({
    el: $('#trip-modal'),
    collection: tripsColl
});
var settingsView = new SettingsView({
    el: $('.settings-container')
});
var resultsView = new ResultsView({
    el: $('.results-container'),
    collection: tripsColl
});


// Init Calendar
var currentYear = new Date().getFullYear();
$('#calendar').calendar({ 
    style: 'background',
    alwaysHalfDay: true,
    enableRangeSelection: true,
    mouseOnDay: mouseOnTrip,
    mouseOutDay: function(e){
        if(e.events.length > 0){
            $(e.element).popover('hide');
        }
    },
    selectRange: function(e){
        var startDate = safeDate(e.startDate);
        var endDate = safeDate(e.endDate);
        tripForm.showTripForm(startDate, endDate);
    },
    dataSource: []
});

// Update the calendar every time the trips collection changes
tripsColl.on('change reset', function(){
    var tripsList = [];
    this.each(function(trip){
        tripsList.push({
            country: _.find(COUNTRIES, {
                code: trip.attributes.country.toUpperCase()
            }).name,
            startDate: safeDate(trip.attributes.startDate)._d,
            endDate: safeDate(trip.attributes.endDate)._d
        });
    });
    
    $('#calendar').data('calendar').setDataSource(tripsList);
});

// Load trips data
// Note: This triggers everything to redraw (change/reset events fired)
tripsColl.fetch({ reset: true });

