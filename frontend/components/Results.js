import React from "react";
import CSSModules from 'react-css-modules';
import ReactTooltip from 'react-tooltip'
import classNames from 'classnames/bind'

import globe from './globe.svg'
import css from './results.css'
import Class from './models/Class'
import macros from './macros'

const cx = classNames.bind(css);


// Results page component
class Results extends React.Component {

	constructor(props) {
		super(props);

		this.state = {
			classes: this.props.classes.slice(0, 10)
		}

		this.alreadyLoadedAt = {}

		this.handleInfiniteLoad = this.handleInfiniteLoad.bind(this)
	}

	handleInfiniteLoad() {
		var resultsBottom = this.refs.elementsContainer.offsetHeight + this.refs.elementsContainer.offsetTop

		var diff = window.scrollY + 2000 + window.innerHeight - resultsBottom 

		// Assume about 300 px per class
		if (diff > 0 && this.props.classes.length > this.state.classes.length && !this.alreadyLoadedAt[this.state.classes.length]) {
			this.alreadyLoadedAt[this.state.classes.length] = true
			this.setState({
				classes: this.props.classes.slice(0, 10 + this.state.classes.length)
			})
		}
	}

	componentDidMount() {
		window.addEventListener('scroll', this.handleInfiniteLoad);
	}

	componentWillUnmount() {
		window.removeEventListener('scroll', this.handleInfiniteLoad)
	}

	componentWillReceiveProps(nextProps) {
		this.alreadyLoadedAt = {}
		this.setState({
			classes: nextProps.classes.slice(0, 10)
		})
	}

	componentDidUpdate(prevProps, prevState) {
		ReactTooltip.rebuild()
		console.log('did update')
	}

    render() {
	  	if (!this.state.classes || this.state.classes.length == 0) {
	  		return null;
	  	}

		var elements = this.state.classes.map((aClass) => {

			// Render the section table if this class has sections
			var sectionTable = null;
			if (aClass.sections && aClass.sections.length > 0) {


				// Add the Exam column headers if there is any section in this class that has exam listed
				var examColumnHeaders = null
				if (aClass.sectionsHaveExam()) {
					examColumnHeaders = [
						<th key="1">Exam start</th>,
	                    <th key="2">Exam end</th>,
	                    <th key="3">Exam date</th>
                    ]
				}

				sectionTable = (
					<table className={"ui celled striped table " + css.resultsTable}>
				      <thead>
				        <tr>
					        <th> 
					        	<div className = {css.inlineBlock} data-tip="Course Reference Number">
					        		CRN
					        	</div>
					        </th>
					        <th> Professors </th>
					        <th> Weekdays </th>
					        <th> Start </th>
					        <th> End </th>
				            {examColumnHeaders}
					        <th> Location </th>
					        <th> Seats </th>

					        <th className={cx({
					        	displayNone: !aClass.getHasWaitList()
					        })}> Waitlist seats </th>
					        <th> Link </th>
					      </tr>


				      </thead>
				      <tbody>
					    {/* The CSS applied to the table stripes every other row, starting with the second one. 
					    	This tr is hidden so the first visible row is a dark stripe instead of the second one. */}
				        <tr style={{display:'none'}}></tr>
				        {aClass.sections.map(function(section) {

				        	// Calculate the "Meets on Tuesday, Friday" or "No Meetings found" string that hovers over the weekday boxes
				        	var meetingDays = section.getWeekDaysAsStringArray()
				        	var meetingString
				        	if (meetingDays.length == 0) {
				        		meetingString = "No Meetings found"
				        	}
				        	else {
				        		meetingString = 'Meets on ' + meetingDays.join(', ')
				        	}

				        	// Calculate the weekday boxes eg [][x][][][x] for Tuesday Friday
				        	var booleans = section.getWeekDaysAsBooleans();
			          		if (!section.meetsOnWeekends()) {
			          			booleans = booleans.slice(1, 6)
			          		}

				          	var booleanElements = booleans.map(function (meets, index) {
		          				return (
		          					<div key={index} className={cx({
		          						weekDayBoxChecked: meets,
		          						weekDayBox: true
		          					})}></div>
	          					)
			          		})

			          		// Calculate the Google Maps links
			          		var locationElements = section.getLocations().map(function(location, index, locations) {

			          			var buildingName
			          			if (location.match(/\d+\s*$/i)) {
			          				buildingName = location.replace(/\d+\s*$/i, '')
			          			}
			          			else {
			          				buildingName = location
			          			}

			          			var optionalComma = null
			          			if (index != locations.length -1) {
			          				optionalComma = ','
			          			}

			          			if (location.toUpperCase() == 'TBA') {
			          				if (locations.length > 1)
			          				{
				          				return null;
			          				}
			          				else {
										return 'TBA'			          					
			          				}
			          			}

		          				return (
		          					<span key={location}>
			          					<a target='_blank' rel="noopener noreferrer" href={`https://maps.google.com/?q=${macros.collegeName} ${buildingName}`}>
			          						{location}
		          						</a> {optionalComma}
		          					</span>
	          					)
			          		})

			          		// Calculate the exam elements in each row
			          		var examElements = null
			          		if (aClass.sectionsHaveExam()) {
			          			var examMoments = section.getExamMoments()
			          			if (examMoments) {
			          				examElements = [
				          				  <td key="1">{examMoments.start.format('h:mm a')}</td>,
			                              <td key="2">{examMoments.end.format('h:mm a')}</td>,
			                              <td key="3">{examMoments.start.format('MMM Do')}</td>
			          				]
			          			}
			          			else {
			          				examElements = [
				          				  <td key="1"></td>,
			                              <td key="2"></td>,
			                              <td key="3"></td>
		          					]
			          			}
			          		}


				        	return (
				        		<tr key={section._id}>
						          <td> {section.crn} </td>
						          <td> {section.getProfs().join(', ')} </td>
						          <td> 
							          <div className={css.inlineBlock} data-tip={meetingString}>
							          	{booleanElements} 
	      						      </div>
  						          </td>
						          
		                          <td>{section.getUniqueStartTimes().join(", ")}</td>
		                          <td>{section.getUniqueEndTimes().join(", ")}</td>
		                          {examElements}
		                          <td>
		                          	{locationElements}
		                          </td>
		                          <td>
		                          	<div data-tip="Open Seats/Total Seats" className={css.inlineBlock}>
			                          {section.seatsRemaining}/{section.seatsCapacity} 
		                          	</div> 
		                          </td>

								  <td className={cx({
							        	displayNone: !aClass.getHasWaitList()
							        })}>
		                          	<div data-tip="Open/Total Waitlist Seats" className={css.inlineBlock}>
			                          {section.waitRemaining}/{section.waitCapacity} 
		                          	</div> 
		                          </td>

		                          <td> 
		                          	<a target='_blank' rel="noopener noreferrer" className={css.inlineBlock} data-tip={"View on " + section.host} href={section.prettyUrl || section.url}> 
		                          		<img src={globe} /> 
		                          	</a> 
		                          </td>
						        </tr>
			        		)
				        })}
				      </tbody>
				    </table>

				)
			}


			// Render each class

			// Figure out the credits string
			var creditsString
			if (aClass.maxCredits === aClass.minCredits) {
				creditsString = `${aClass.minCredits} credits`
			}
			else {
				creditsString = `${aClass.maxCredits} to ${aClass.minCredits} credits`
			}


	    	return (
				<div key={aClass._id} className={css.container + " ui segment"}> 
					<div className={css.header}>
						{aClass.subject} {aClass.classId}: {aClass.name}
					</div>

					<div className={css.body}>
						{aClass.desc} 
						<br />
						<br />
						<div className = {css.leftPanel}>
							Prerequisites: {aClass.getPrereqsString()}
							<br />
							Corequisites: {aClass.getCoreqsString()}
						</div>
						<div className = {css.rightPanel}>
							Updated {aClass.getLastUpdateString()}
							<br />
							{creditsString}
						</div>
					</div>
					{sectionTable}
			    </div>
		    )
	    })

	    return (
	    	<div ref='elementsContainer'>
	    		{elements}
		    	<ReactTooltip effect="solid"/>
    		</div>
    	)

    }
}

export default Results;