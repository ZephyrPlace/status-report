import React, { Component } from 'react';
import Storages from 'js-storage';

class AuthPrompt extends Component {

    constructor(props) {
        super(props);
        this.state = { user: '', pw: '' };
    }

    handleUserChange = (event) => {
        this.setState({ user: event.target.value });
    }

    handlePwChange = (event) => {
        this.setState({ pw: event.target.value });
    }

    handleSubmit = (event) => {
        const storage = Storages.sessionStorage;
        storage.set('user', this.state.user);
        storage.set('pw', this.state.pw);
        event.preventDefault();
        this.props.signIn();
    }

    render() {
        return (
            <form onSubmit={this.handleSubmit}>
                <label>
                    User:<br />
                    <input type="text" value={this.state.user} onChange={this.handleUserChange} />
                </label>
                <br />
                <label>
                    Password:<br />
                    <input type="password" value={this.state.pw} onChange={this.handlePwChange} />
                </label>
                <br />
                <input type="submit" value="Submit" />
            </form>
        );
    }
}

export default AuthPrompt;