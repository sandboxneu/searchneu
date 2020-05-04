/*
 * This file is part of Search NEU and is licensed under AGPL3.
 * See the license file in the root folder for details.
 */

import React from 'react';
import { Checkbox, Icon } from 'semantic-ui-react';
import PropTypes from 'prop-types';
import user from '../user';
import Keys from '../../../common/Keys';

// This file renders the checkboxes that control which sections a user signs up for
// notifications.
export default class NotifCheckBox extends React.Component {
  // the only thing required for you to pass in is what section this NotifCheckBox
  // was rendered in. We can get all the other data from that.
  static propTypes = {
    section: PropTypes.object.isRequired,
  }

  // creates a new Notification Check Box that has the section's
  // hash in section, and sets checked to be the initial value of if the section
  // is currently in the user or not
  constructor(props) {
    super(props);

    this.state = {
      // Whether a user already signed up for notifications on this section.
      checked: user.isWatchingSection(Keys.getSectionHash(this.props.section)),
    };

    this.onCheckboxClick = this.onCheckboxClick.bind(this);
    this.onUserUpdate = this.onUserUpdate.bind(this);
  }


  componentDidMount() {
    // Register a handler to get updates if user changes.
    user.registerUserChangeHandler(this.onUserUpdate);
  }

  componentWillUnmount() {
    user.unregisterUserChangeHandler(this.onUserUpdate);
  }

  // If user changes and those user changes mean that we should
  // change this.state.checked, make that change.
  // Internal only.
  onUserUpdate() {
    // Show the notification toggles if the user is watching this class.
    const checked = user.isWatchingSection(Keys.getSectionHash(this.props.section));
    if (checked !== this.state.checked) {
      this.setState({
        checked: checked,
      });
    }
  }

  // if the state is currently checked, uncheck, remove the section from the user's data
  // do opposite.
  // send data to backend
  async onCheckboxClick() {
    if (this.state.checked) {
      user.removeSection(this.props.section);
      this.setState({ checked: false });
    } else {
      user.addSection(this.props.section);
      this.setState({ checked: true });
    }
  }


  // renders the proper checkbox. If there are still seats, then make it read
  // only, otherwise, set up callback on onChange
  render() {
    // Don't show the toggle if this section has over 5 remaining seats.
    if (this.props.section.seatsRemaining > 5) {
      return <div style={{ color: '#d3d3d3' }} data-tip='There are still seats remaining for this section' className='inlineBlock'><Icon name='info circle' className='myIcon' /></div>;
    }

    return (
        <div data-tip='Sign up for notifications for this section' className='inlineBlock'>
          <Checkbox toggle checked={ this.state.checked } onChange={ this.onCheckboxClick } />
        </div>
    );
  }
}
