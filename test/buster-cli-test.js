var buster = require("buster");
var busterEventedLogger = require("buster-evented-logger")
var assert = buster.assert;
var refute = buster.refute;
var busterCli = require("../lib/buster-cli");
var cliHelper = require("../lib/test-helper");

buster.testCase("buster-cli", {
    setUp: function () {
        this.cli = busterCli.create();
    },

    "should have logger": function () {
        assert(busterEventedLogger.isPrototypeOf(this.cli.logger));
    },

    "should run without callback": function () {
        cliHelper.mockLogger(this);
        this.cli.run(["--help"]);
        assert(true);
    },

    "generic help output": {
        setUp: function () {
            cliHelper.mockLogger(this);
        },

        "should include mission statement": function (done) {
            var self = this;
            var statement = "A small CLI that only lives in the test suite.";
            this.cli.missionStatement = statement;
            this.cli.run(["--help"], function () {
                assert.match(self.stdout, statement);
                done();
            });
        },

        "should include description": function (done) {
            var self = this;
            var desc = "How about that.";
            this.cli.description = desc;
            this.cli.run(["--help"], function () {
                assert.match(self.stdout, desc);
                done();
            });
        },

        "should list help output for all options, including --help": function (done) {
            var self = this;
            var portOpt = this.cli.opt("-p", "--port", "Help text is here.");

            this.cli.run(["--help"], function () {
                assert.match(self.stdout, /-h\/--help \s*Show this message\./);
                assert.match(self.stdout, /-p\/--port \s*Help text is here\./);
                done();
            });
        }
    },

    "log levels": {
        setUp: function () {
            cliHelper.mockLogger(this);
        },

        "should set to log by default": function (done) {
            this.cli.onRun = function () {
                this.logger.info("Yo man");
                this.logger.log("Hey");
            };

            cliHelper.run(this, [], function () {
                refute.stdout("Yo man");
                assert.stdout("Hey");
                done();
            });
        },

        "should set to info with --log-level": function (done) {
            this.cli.onRun = function () {
                this.logger.info("Yo man");
                this.logger.log("Hey");
            };

            cliHelper.run(this, ["--log-level", "info"], function () {
                assert.stdout("Yo man");
                done();
            });
        },

        "should include --log-level in help output": function (done) {
            cliHelper.run(this, ["-h"], function () {
                assert.stdout("-l/--log-level");
                assert.stdout("Set logging level");
                done();
            });
        },

        "should fail if providing -l without argument": function (done) {
            cliHelper.run(this, ["-l"], function () {
                assert.stderr("No value specified");
                done();
            });
        },

        "should fail if providing illegal logging level": function (done) {
            cliHelper.run(this, ["-l", "dubious"], function () {
                assert.stderr("one of [error, warn, log, info, debug], got dubious");
                done();
            });
        },

        "should set to info with -v": function (done) {
            this.cli.onRun = function () {
                this.logger.debug("Yo man");
                this.logger.info("Hey");
            };

            cliHelper.run(this, ["-v"], function () {
                refute.stdout("Yo man");
                assert.stdout("Hey");
                done();
            });
        },

        "should set to debug with -vv": function (done) {
            this.cli.onRun = function () {
                this.logger.debug("Yo man");
                this.logger.info("Hey");
            };

            cliHelper.run(this, ["-vv"], function () {
                assert.stdout("Yo man");
                done();
            });
        },

        "should fail if setting -v more than twice": function (done) {
            cliHelper.run(this, ["-vvv"], function () {
                assert.stderr("-v can only be set two times.");
                done();
            });
        }
    },

    "option": {
        setUp: function () {
            this.port = this.cli.opt("-p", "--port", "Help text is here.", {});
        },

        "should be addressable by short key": function (done) {
            var self = this;
            this.cli.run(["-p"], function () {
                assert(self.port.isSet);
                done();
            });
        },

        "should be addressable by long key": function (done) {
            var self = this;
            this.cli.run(["--port"], function () {
                assert(self.port.isSet);
                done();
            });
        }
    },

    "test calls 'loadOptions' once if present": function (done) {
        var self = this;
        cliHelper.mockLogger(this);
        this.cli.loadOptions = this.spy();

        this.cli.run(["--help"], function () {
            self.cli.run(["--help"], function () {
                assert(self.cli.loadOptions.calledOnce);
                done();
            });
        });
    },

    "help topics": {
        setUp: function () {
            cliHelper.mockLogger(this);
            this.cli.helpTopics = {
                "topic": "This is the text for the topic.",
                "other": "Another topic"
            }
        },

        "should be listed with the description of --help in the --help output": function (done) {
            var self = this;
            this.cli.run(["--help"], function () {
                assert.match(self.stdout, "See also --help [topic,other].");
                done();
            });
        },

        "should print topic help with --help sometopic": function (done) {
            var self = this;
            this.cli.run(["--help", "topic"], function () {
                assert.equals(self.stdout, "This is the text for the topic.\n");
                done();
            });
        },

        "should print error message with --help noneexistingtopic": function (done) {
            var self = this;
            this.cli.run(["--help", "doesnotexist"], function () {
                assert.equals(self.stderr, "No such help topic 'doesnotexist'. "
                              + "Try without a specific help topic, or one of: topic,other.\n");
                done();
            });
        },

        "should print topic unwrapped when just one topic": function (done) {
            var self = this;

            this.cli.helpTopics = {
                "topic": "This is the text for the topic."
            }

            this.cli.run(["--help"], function () {
                assert.match(self.stdout, "See also --help topic.");
                done();
            });
        },

        "should not print any topic information when empty topics object is specified": function (done) {
            this.cli.helpTopics = {};
            var self = this;
            this.cli.run(["--help"], function () {
                refute.match(self.stdout, "See also --help [].");
                done();
            });
        }
    },

    "option restricted to list of values": {
        setUp: function () {
            cliHelper.mockLogger(this);
            this.aaaOpt = this.cli.opt("-a", "--aaa", "Aaaaa!", {
                values: ["foo", "bar", "baz"]
            });
        },

        "should list available options in help output": function (done) {
            var self = this;
            this.cli.run(["--help"], function () {
                assert.match(self.stdout, "One of foo, bar, baz.");
                done();
            });
        },

        "should get value set when value passed to it": function (done) {
            var self = this;
            this.cli.run(["-a", "bar"], function () {
                assert.equals(self.aaaOpt.value(), "bar");
                done();
            });
        },

        "should error when getting a value not in the list": function (done) {
            var self = this;
            this.cli.run(["-a", "lolcat"], function () {
                // The actual error message comes from buster-args.
                // TODO: Find a better way to test the error msg here.
                refute.equals(self.stderr, "");
                done();
            });
        }
    },

    "option with default value": {
        setUp: function () {
            cliHelper.mockLogger(this);
            this.aaaOpt = this.cli.opt("-f", "--ffff", "Fffffuuu", {
                defaultValue: "DRM"
            });
        },

        "should print default value in help text": function (done) {
            var self = this;
            this.cli.run(["--help"], function () {
                assert.match(self.stdout, "Default is DRM.");
                done();
            });
        },

        "should have default value": function (done) {
            var self = this;
            this.cli.run([], function () {
                assert.equals(self.aaaOpt.value(), "DRM");
                done();
            });
        },

        "should provide overridden value": function (done) {
            var self = this;
            this.cli.run(["-f", "gaming consoles"], function () {
                assert.equals(self.aaaOpt.value(), "gaming consoles");
                done();
            });
        },

        " should fail with no value": function (done) {
            // Not failing. Probably a flaw in buster-args.
            var self = this;
            this.cli.run(["-f"], function () {
                refute.equals(self.stderr, "");
                done();
            });
        }
    },

    "option with value": {
        setUp: function () {
            cliHelper.mockLogger(this);
            this.someOpt = this.cli.opt("-s", "--ss", "A creeper.", {
                hasValue: true
            });
        },

        "should get value assigned": function (done) {
            var self = this;
            this.cli.run(["-s", "ssssssBOOOOOM!"], function () {
                assert.equals(self.someOpt.value(), "ssssssBOOOOOM!");
                done();
            });
        }
    },

    "option with validator": {
        setUp: function () {
            cliHelper.mockLogger(this);
            this.anOpt = this.cli.opt("-c", "--character", "The character.", {
                validators: {"required": "Here's a custom error msg."}
            });
        },

        "should perform validation": function (done) {
            var self = this;
            this.cli.run([], function () {
                assert.match(self.stderr, "Here's a custom error msg.");
                done();
            });
        }
    },

    "operand": {
        setUp: function () {
            cliHelper.mockLogger(this);
            this.fooOpd = this.cli.opd("Foo", "Does a foo.");
        },

        "should be listed in --help output": function (done) {
            var self = this;
            this.cli.run(["--help"], function () {
                assert.match(self.stdout, /Foo +   Does a foo/);
                done();
            });
        },

        "should get value assigned": function (done) {
            var self = this;
            this.cli.run(["some value"], function () {
                assert.equals(self.fooOpd.value(), "some value");
                done();
            });
        }
    },

    "should call onRun when there are no errors": function (done) {
        this.cli.onRun = function () {
            assert(true);
            done();
        };

        this.cli.run([], function () {});
    },

    "should not call onRun when there are errors": function (done) {
        var self = this;
        cliHelper.mockLogger(this);
        this.cli.onRun = this.spy();
        var someOpt = this.cli.opt("-a", "--aa", "Aaaaa");
        someOpt.addValidator(function () { return "An error."; });
        this.cli.run(["-a"], function () {
            refute(self.cli.onRun.called);
            done();
        });
    },

    "panicing": {
        setUp: function () {
            cliHelper.mockLogger(this);
            this.stub(process, "exit");
        },

        "should logg to stderr": function (done) {
            var self = this;

            this.cli.onRun = function () {
                this.err("Uh-oh! Trouble!");
            };

            this.cli.run([], function () {
                assert.equals(self.stdout, "");
                assert.match(self.stderr, "Uh-oh! Trouble!");
                done();
            });
        }
    },

    "configuration": {
        setUp: function () {
            cliHelper.cdFixtures();
            cliHelper.mockLogger(this);
            this.cli.addConfigOption();
        },

        tearDown: cliHelper.clearFixtures,

        "should fail if config does not exist": function (done) {
            this.cli.run(["-c", "file.js"], function () {
                assert.match(this.stderr, "-c/--config: file.js is not a file");
                done();
            }.bind(this));
        },

        "should fail if config is a directory": function (done) {
            cliHelper.mkdir("buster");

            this.cli.run(["-c", "buster"], function () {
                assert.match(this.stderr, "-c/--config: buster is not a file");
                done();
            }.bind(this));
        },

        "should fail if default config does not exist": function (done) {
            this.cli.run([], function () {
                this.cli.onConfig(function (err) {
                    assert.match(err.message,
                                 "-c/--config not provided, and none of\n" +
                                 "[buster.js, test/buster.js, spec/buster.js] exists");
                    done();
                });
            }.bind(this));
        },

        "should fail if config contains errors": function (done) {
            cliHelper.writeFile("buster2.js", "modul.exports");

            this.cli.run(["-c", "buster2.js"], function () {
                this.cli.onConfig(function (err) {
                    assert.match(err.message, "Error loading configuration buster2.js");
                    assert.match(err.message, "modul is not defined");
                    assert.match(err.stack, /\d+:\d+/);
                    done();
                });
            }.bind(this));
        },

        "config groups": {
            setUp: function () {
                cliHelper.writeFile("buster.js", "module.exports = " + JSON.stringify({
                    "Node tests": { environment: "node" },
                    "Browser tests": { environment: "browser" }
                }));
            },

            "should only yield config for provided group": function (done) {
                this.cli.run(["-g", "Browser tests"], function () {
                    var spy = this.spy(function () {
                        setTimeout(function () {
                            assert.calledOnce(spy);
                            assert.equals(spy.args[0][1].description, "Browser tests");
                            done();
                        }, 5);
                    });

                    this.cli.onConfig(spy);
                }.bind(this));
            },

            "should only yield config for fuzzily matched group": function (done) {
                this.cli.run(["-g", "browser"], function () {
                    var spy = this.spy(function () {
                        setTimeout(function () {
                            assert.calledOnce(spy);
                            assert.equals(spy.args[0][1].description, "Browser tests");
                            done();
                        }, 5);
                    });

                    this.cli.onConfig(spy);
                }.bind(this));
            }
        },

        "config environments": {
            setUp: function () {
                cliHelper.writeFile("buster.js", "module.exports = " + JSON.stringify({
                    "Node tests": { environment: "node" },
                    "Browser tests": { environment: "browser" }
                }));
            },

            "should only yield config for provided environment": function (done) {
                this.cli.run(["-e", "node"], function () {
                    var spy = this.spy(function () {
                        setTimeout(function () {
                            assert.calledOnce(spy);
                            assert.equals(spy.args[0][1].description, "Node tests");
                            done();
                        }, 5);
                    });

                    this.cli.onConfig(spy);
                }.bind(this));
            },

            "should match config environments with --environment": function (done) {
                this.cli.run(["--environment", "browser"], function () {
                    var spy = this.spy(function () {
                        setTimeout(function () {
                            assert.equals(spy.args[0][1].description, "Browser tests");
                            done();
                        }, 5);
                    });

                    this.cli.onConfig(spy);
                }.bind(this));
            }
        }
    }
});
