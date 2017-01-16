import React, { Component } from 'react';
import { Line } from 'react-chartjs-2';
import axios from 'axios';
import Storages from 'js-storage';
import wurl from 'wurl';


/**
 * Moment js utils
 */
import moment from 'moment';
import business from 'moment-business';
/**
 * Style
 */
import './App.css';

class Burndown extends Component {

    constructor(props) {
        super(props)
        this.state = {
            showWeekend: true,
            // week: [
            //     { date: moment('2016-12-11T20:09:31Z', moment.ISO_8601), remaining: 100, burn: 0 },
            //     { date: moment('2016-12-12T20:09:31Z', moment.ISO_8601), remaining: 80, burn: 20 },
            //     { date: moment('2016-12-13T20:09:31Z', moment.ISO_8601), remaining: 83, burn: 17 },
            //     { date: moment('2016-12-14T20:09:31Z', moment.ISO_8601), remaining: 74, burn: 26 },
            //     { date: moment('2016-12-15T20:09:31Z', moment.ISO_8601), remaining: 45, burn: 55 },
            //     { date: moment('2016-12-16T20:09:31Z', moment.ISO_8601), remaining: 10, burn: 90 },
            //     { date: moment('2016-12-17T20:09:31Z', moment.ISO_8601), remaining: 10, burn: 90 },
            //     { date: moment('2016-12-18T20:09:31Z', moment.ISO_8601), remaining: 10, burn: 90 },
            //     { date: moment('2016-12-19T20:09:31Z', moment.ISO_8601), remaining: 3, burn: 97 }
            // ],
            weekends: [],
            milestone: {},
            milestones: [],
            issues: [],
            gitUser: wurl('sub', window.location.href),
            gitRepo: wurl('path', window.location.href)
        };
        const storage = Storages.sessionStorage;

        this.instance = axios.create({
            baseURL: 'https://api.github.com/',
            timeout: 15000,
            auth: {
                username: storage.get('user'),
                password: storage.get('pw')
            },
            headers: { 'Accept': 'application/vnd.github.v3+json' }
        });
    }

    componentDidMount = () => {
        console.log(this.state.gitUser);
        console.log(this.state.gitRepo);
        this.instance.get(`repos/${this.state.gitUser + this.state.gitRepo}/milestones`)
            .then(function (response) {
                this.setState({ milestones: response.data, milestoneNumber: response.data[0].number }, this.handleMilestoneChange);
            }.bind(this));
    }

    handleShowWeekend = () => {
        this.setState({ showWeekend: !this.state.showWeekend }, this.handleWeekend);
    }

    handleMilestoneChange = (event) => {
        var number = event ? event.target.value : this.state.milestoneNumber;
        this.instance.get(`repos/${this.state.gitUser + this.state.gitRepo}/milestones/${number}`)
            .then(function (response) {
                console.log(response.data)
                this.setState({ milestone: response.data, milestoneNumber: number }, this.handleMilestoneSelection);
            }.bind(this));

    }

    handleMilestoneSelection = () => {
        this.instance.get(`repos/${this.state.gitUser + this.state.gitRepo}/issues?milestone=${this.state.milestone.number}&state=all`)
            .then(function (response) {
                this.setState({ issues: response.data }, this.handleWeek);
            }.bind(this));
    }

    handleWeek = () => {
        var start = moment(this.state.milestone.created_at, moment.ISO_8601).startOf('day');
        var end = moment(this.state.milestone.due_on, moment.ISO_8601).startOf('day');
        var today = moment().startOf('day');

        end = moment.max(end, today);

        var auxWeek = [];
        auxWeek.push({ date: start });
        function recursiveWeek() {
            if (!auxWeek[auxWeek.length - 1].date.isSame(end)) {
                auxWeek.push({ date: moment(auxWeek[auxWeek.length - 1].date).add(1, 'd') });
                recursiveWeek();
            }
        }
        recursiveWeek();

        for (var week = 0; week < auxWeek.length; week++) {
            var remaing = week ? auxWeek[week - 1].remaining : (this.state.milestone.closed_issues + this.state.milestone.open_issues);
            var burn = week ? auxWeek[week - 1].burn : 0;
            for (var index in this.state.issues) {
                if (this.state.issues[index].closed_at) {
                    var close_at = moment(this.state.issues[index].closed_at, moment.ISO_8601).startOf('day');
                    if (close_at.isSame(auxWeek[week].date)) {
                        burn++;
                        remaing--;
                    }
                }
            }
            auxWeek[week]["remaining"] = remaing;
            auxWeek[week]["burn"] = burn;
        }

        auxWeek = auxWeek.sort(function (a, b) {
            return a.date - b.date;
        });

        //     { date: moment('2016-12-11T20:09:31Z', moment.ISO_8601), remaining: 100, burn: 0 },
        console.log(auxWeek);
        this.setState({ week: auxWeek })
    }

    handleWeekend = () => {
        var week;
        var weekends = [];
        if (!this.state.showWeekend) {
            week = this.state.week;
            for (var day = 0; day < week.length; day++) {
                var date = week[day].date;
                if (business.isWeekendDay(date)) {
                    weekends.push(week[day]);
                }
            }
            for (var remove = 0; remove < weekends.length; remove++) {
                var index = week.indexOf(weekends[remove]);
                week.splice(index, 1);
            }
            this.setState({ week: week, weekends: weekends });
        } else {
            week = this.state.week;
            weekends = this.state.weekends;
            var auxWeek = [];
            week = week.concat(weekends);

            auxWeek = week.sort(function (a, b) {
                return a.date - b.date;
            });

            this.setState({ week: auxWeek, weekends: [] })

        }
    }

    handleExpected = (max, dates) => {

        var end = moment(this.state.milestone.due_on, moment.ISO_8601).startOf('day');

        for (var d = 0; d < dates.length; d++) {
            if (dates[d].date.isSame(end)) {
                dates = dates.slice(0, d === dates.length ? d : d + 1);
                break;
            }
        }


        var expected = [];
        if (!this.state.showWeekend) {
            max = dates[0].expected ? dates[0].expected : dates[0].remaining;
        }
        expected[0] = max;
        var aux = max / (dates.length - 1);
        var aux2 = 0;
        for (var d in dates) {
            if (business.isWeekendDay(dates[d].date)) {
                aux2++;
            }
        }
        aux2 = aux2 - 1;
        var menos = (aux2 * aux / (dates.length - 1 - aux2))
        for (var i = 1; i < dates.length; i++) {
            var result;
            if (business.isWeekendDay(dates[i].date)) {
                result = expected[i - 1];
                dates[i].expected = result;
                expected[i] = result;
            } else {
                result = expected[i - 1] - (aux + menos);
                dates[i].expected = result > 0 ? result : 0;
                expected[i] = result > 0 ? result : 0;
            }
        }

        return expected;
    }

    render() {
        var data;
        if (this.state.week) {
            const dates = this.state.week.map(function (a) { return a.date.format("DD/MM/YYYY"); });
            const remaining = this.state.week.map(function (a) { return a.remaining; });
            const burn = this.state.week.map(function (a) { return a.burn; });
            const expected = this.handleExpected((this.state.milestone.closed_issues + this.state.milestone.open_issues), this.state.week);

            data = {
                labels: dates,
                datasets: [
                    {
                        label: 'Remaining',
                        fill: false,
                        lineTension: 0,
                        backgroundColor: 'rgba(75,192,192,0.4)',
                        borderColor: 'rgba(75,192,192,1)',
                        borderCapStyle: 'butt',
                        borderDash: [],
                        borderDashOffset: 0.0,
                        borderJoinStyle: 'miter',
                        pointBorderColor: 'rgba(75,192,192,1)',
                        pointBackgroundColor: '#fff',
                        pointBorderWidth: 1,
                        pointHoverRadius: 5,
                        pointHoverBackgroundColor: 'rgba(75,192,192,1)',
                        pointHoverBorderColor: 'rgba(220,220,220,1)',
                        pointHoverBorderWidth: 2,
                        pointRadius: 1,
                        pointHitRadius: 10,
                        data: remaining
                    },
                    {
                        label: 'Burn',
                        fill: false,
                        lineTension: 0,
                        backgroundColor: 'rgba(255,20,20,0.4)',
                        borderColor: 'rgba(255,20,20,1)',
                        borderCapStyle: 'butt',
                        borderDash: [],
                        borderDashOffset: 0.0,
                        borderJoinStyle: 'miter',
                        pointBorderColor: 'rgba(255,20,20,1)',
                        pointBackgroundColor: '#fff',
                        pointBorderWidth: 1,
                        pointHoverRadius: 5,
                        pointHoverBackgroundColor: 'rgba(255,20,20,1)',
                        pointHoverBorderColor: 'rgba(255,20,20,1)',
                        pointHoverBorderWidth: 2,
                        pointRadius: 1,
                        pointHitRadius: 10,
                        data: burn
                    },
                    {
                        label: 'Expected',
                        fill: true,
                        lineTension: 0,
                        backgroundColor: 'rgba(225,225,225,0.4)',
                        pointBorderWidth: 0,
                        pointHoverRadius: 0,
                        pointHoverBorderWidth: 0,
                        pointRadius: 0,
                        pointHitRadius: 0,
                        data: expected
                    }

                ]
            };
        }
        return (
            <div>
                <label>
                    Milestones:
                    <select value={this.state.milestoneNumber} onChange={this.handleMilestoneChange}>
                        {
                            this.state.milestones.map((mile) => {
                                return <option key={mile.number} value={mile.number}>{mile.title}</option>
                            })
                        }
                    </select>
                </label>
                <span> - </span>
                {
                    // this.state.week ?
                    //     <label>Show weekends
                    //         <input type="checkbox"
                    //             value={this.state.showWeekend}
                    //             checked={this.state.showWeekend}
                    //             onChange={this.handleShowWeekend} />
                    //     </label>
                    //     : null

                }
                <span> - </span>
                <label>Due date:
                    {moment(this.state.milestone.due_on, moment.ISO_8601).startOf('day').format('DD/MM/YYYY')}
                </label>


                {
                    data ? <Line data={data} /> : null
                }

            </div>
        );
    }
}

export default Burndown;
