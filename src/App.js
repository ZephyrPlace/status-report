import React, { Component } from 'react';
import Burndown from './Burndown.js';
import AuthPrompt from './AuthPrompt.js';
import Header from './Header.js';
import './App.css';

class App extends Component {

  constructor(props) {
    super(props)
    this.state = { auth: false }
  }

  requireAuth = () => {
    this.setState({ auth: false })
  }

  signIn = () => {
    this.setState({ auth: true })
  }

  render() {
    return (
      <div className="App">
        <Header />
        {this.state.auth ? <Burndown /> : <AuthPrompt signIn={this.signIn} />}
      </div>
    );
  }
}

export default App;
