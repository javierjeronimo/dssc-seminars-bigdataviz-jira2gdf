var fs = require('fs');
var JiraApi = require('jira-client');

var outputNodes = new console.Console(fs.createWriteStream('./output_nodes.gdf'));
var outputEdges = new console.Console(fs.createWriteStream('./output_edges.gdf'));

var jira = new JiraApi({
    protocol: 'https',
    host: 'your.jira-server.com',
    username: 'yourusername',
    password: 'yourpassword',
    apiVersion: '2',
    strictSSL: false
});

console.log("Extracting...");

jira.searchJira(
    'status not in (Open)',
    {
        fields: [
            "issuetype",
            "reporter",
            "priority",
            "issuelinks",
            "subtasks",
            "status",
            "project",
            "resolution",
            "created",
            "resolutiondate"
        ],
        maxResults: 100000,
        startAt: 0
    })
    .then(function (result) {
        console.log("Processing " + result.issues.length + " issues...");
        var issues = result.issues.map(function (issue, index) {
            var result = {};
            result.key = issue.key;
            result.type = issue.fields.issuetype ? issue.fields.issuetype.name : "null";
            result.reporter = issue.fields.reporter ? issue.fields.reporter.name : "null";
            result.priority = issue.fields.priority ? issue.fields.priority.name : "null";
            result.issuelinkCount = issue.fields.issuelinks ? issue.fields.issuelinks.length : 0;
            result.subtaskCount = issue.fields.subtasks ? issue.fields.subtasks.length : 0;
            result.status = issue.fields.status ? issue.fields.status.name : "null";
            result.project = issue.fields.project ? issue.fields.project.key : "null";
            result.resolution = issue.fields.resolution ? issue.fields.resolution.name : "null";
            result.created = issue.fields.created;
            result.resolutiondate = issue.fields.resolutiondate;

            return result;
        });

        var mappedData = {
            issues: {},
            users: {}
        }

        console.log("Extracting relationships...");
        issues.forEach(function (issue) {
            if (this.users[issue.reporter] === undefined) {
                console.log(" + User: " + issue.reporter);
                this.users[issue.reporter] = new Array();
            }
            this.users[issue.reporter].push(issue);

            console.log(" + Issue: " + issue.key);
            this.issues[issue.key] = issue; // issue is unique in issues array => pushed once
        }, mappedData);

        console.log("Saving graph: issue nodes...");
        outputNodes.log("nodedef>name VARCHAR,type VARCHAR,priority VARCHAR,issuelinkCount INTEGER,subtaskCount INTEGER,status VARCHAR,project VARCHAR,resolution VARCHAR");
        for (key in mappedData.issues) {
            outputNodes.log(key + "," + mappedData.issues[key].type + "," + mappedData.issues[key].priority + "," + mappedData.issues[key].issuelinkCount + "," + mappedData.issues[key].subtaskCount + "," + mappedData.issues[key].status + "," + mappedData.issues[key].project + "," + mappedData.issues[key].resolution);
        }

        console.log("Saving graph: user nodes...");
        for (name in mappedData.users) {
            outputNodes.log(name + ",User");
        }

        console.log("Saving graph: edges...");
        outputEdges.log("edgedef>node1 VARCHAR,node2 VARCHAR");
        for (name in mappedData.users) {
            mappedData.users[name].forEach(function (issue) {
                outputEdges.log(name + "," + issue.key);
            });
        }
    })
    .catch(function (err) {
        console.error("Error: " + err);
    });
