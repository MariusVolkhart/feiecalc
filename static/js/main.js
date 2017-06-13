'use strict';

var TARGET_COUNT = 330;

// Models
var TripModel = Backbone.Model.extend();


// Collections
var TripsCollection = Backbone.Collection.extend({
    
    model: TripModel,
    localStorage: new Backbone.LocalStorage('trips')
    
});

var SettingsCollection = Backbone.Collection.extend({
    localStorage: new Backbone.LocalStorage('settings'),
    
    _getRangeModel: function(){
        return this.find(function(model) { return model.get('settingKey') === 'range' });
    },
    
    setRange: function(startDate){
        var rangeModel = this._getRangeModel();
        if(!rangeModel){ return false; }
        
        var rangeED = moment(startDate);
        rangeED.add(1, 'years');
        rangeED.subtract(1, 'days');
        
        rangeModel.set({
            startDate: moment(startDate).format(DF),
            endDate: rangeED.format(DF)
        });
        rangeModel.save();
        
        return this.getRange();
    },
    
    getRange: function(){
        var rangeModel = this._getRangeModel();
        if(!rangeModel){ return false; }
        
        return {
            startDate: rangeModel.get('startDate'),
            endDate: rangeModel.get('endDate')
        }
    }
    
});


// Views
var SettingsView = Backbone.View.extend({
    template: _.template($('#template-settings').html()),
    
    events: {
        'change input[data-field=rangeStart]': function(e){
            
            setTimeout(function(){
            
                // Update the range with the new values
                var newSD = moment(e.target.value);
                if(!newSD.isValid()){ return }
                var newRange = this.settingsColl.setRange(newSD.format(DF));
                
                this.range = newRange;
                var rangeEndEl = this.$el.find('input[data-field=rangeEnd]');
                rangeEndEl.val(this.range.endDate);
                
                this.render();
            
            }.bind(this), 250);
            
        },
        'click button[data-action=clear]': function(e){
            e.preventDefault();
            e.target.blur();
            if(!confirm('Are you sure you want to clear all of your trip data?')){
                return;
            }
            var tripModel;
            while (tripModel = tripsColl.first()) {
                tripModel.destroy();
            }
            
            tripsColl.trigger('recalculate');
                
        }
    },
    
    initialize: function(options){
        this.settingsColl = options.settingsColl;
        this.range = this.settingsColl.getRange();
        
        this.settingsColl.on('change reset', this.render.bind(this));
    },
    
    render: function(){
        this.range = this.settingsColl.getRange();
        
        if(!this.range){
            return;
        }
        this.$el.html(this.template({
            startDate: moment(this.range.startDate).format(DF),
            endDate: moment(this.range.endDate).format(DF)
        }));
    }
});

var ResultsView = Backbone.View.extend({
    template: _.template($('#template-results').html()),
    
    events: {},
    
    initialize: function(options){
        this.tripsColl = options.tripsColl;
        this.settingsColl = options.settingsColl;
        
        this.settingsColl.on('change reset', this.render.bind(this));
        
        this.tripsColl.on('recalculate', this.render.bind(this));
        
    },
    
    render: function(){
        var range = this.settingsColl.getRange();
        
        // Get Results
        var rawResults = generateTravelResults(moment(range.startDate), moment(range.endDate));
        
        // Build country days list
        var fullDays = 0;
        var countryDays = [];
        _.keys(rawResults.countries).forEach(function(countryCode){
            var thisCountry = countryByCode(countryCode);
            countryDays.push({
                country: thisCountry.name,
                emoji: thisCountry.emoji,
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
        'change [data-field=trip-country]': function(e, sec){
            var selectedCountry = countryByCode(e.target.value);
            if(selectedCountry.blocked){
                alert('The US considers this to be a US territory, therefore it does not count towards your exemption. You should leave this time period blank on your calendar.');
            }
        },
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
        
        var selectedCountry = countryByCode(values.country);
        if(selectedCountry.blocked){
            alert('You do not need to list your trips to US territories');
            return false;
        }
        
        
        // Does this trip overlap with another trip ?
        // TODO this currently conflicts with its own trip
        if(false && !freeDateRange(values.startDate, values.endDate)){
            alert('Cannot overlap other trips');
            return false;
        }
        
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
        var thisTrip;
        if(values.id){
            thisTrip = tripsColl.get(values.id);
            thisTrip.set({
                country: values.country,
                startDate: values.startDate,
                endDate: values.endDate
            });
        }else{
            thisTrip = new TripModel({
                country: values.country,
                startDate: values.startDate,
                endDate: values.endDate
            });
            tripsColl.add(thisTrip);
        }
        thisTrip.save();
        
        
        // Close the modal
        this.$el.modal('hide');
        this.$el.find('[data-field=trip-country]').val('').selectpicker('refresh');
        this.$el.find('[data-field=trip-id]').val('');
        
        tripsColl.trigger('recalculate');
        
    },
    
    deleteTrip: function(){
        if(confirm('Are you sure you want to delete this trip?')){
            var tripId = this.$el.find('[data-field=trip-id]').val();
            var thisTrip = tripsColl.get(tripId);
            thisTrip.destroy();
            this.$el.modal('hide');
            
            tripsColl.trigger('recalculate');
        }
    }
    
});


// Init    

// Load the trips collection
var settingsColl = new SettingsCollection();
var tripsColl = new TripsCollection();

var tripForm = new TripFormView({
    el: $('#trip-modal'),
    collection: tripsColl
});
var settingsView = new SettingsView({
    el: $('.settings-container'),
    settingsColl: settingsColl
});
var resultsView = new ResultsView({
    el: $('.results-container'),
    tripsColl: tripsColl,
    settingsColl: settingsColl
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
tripsColl.on('recalculate', function(newModel){
    if(newModel && newModel.get('sampleTrip')){ return }
    
    var tripsList = [];
    this.each(function(trip){
        var thisCountry = _.find(COUNTRIES, {
            code: trip.attributes.country.toUpperCase()
        })
        tripsList.push({
            country: thisCountry.name,
            startDate: safeDate(trip.attributes.startDate)._d,
            endDate: safeDate(trip.attributes.endDate)._d
        });
    });
    
    $('#calendar').data('calendar').setDataSource(tripsList);
});

// Load trips data
// Note: This triggers everything to redraw (change/reset events fired)
settingsColl.fetch({ reset: true, success: function(){
    if(!settingsColl.length){
        // This sets the deafault range values
        bootstrapAppData(tripsColl, settingsColl);
    }
    tripsColl.fetch({ reset: true, success: function(coll){
        coll.trigger('recalculate');
    }.bind(this)});
}});

// Init expandable pub54
$('.expand-btn-container button').click(function(){
    $(this).addClass('hide');
    $(this).parents('.alert').css('height', 'auto');
});
