import React from 'react';
class Footer extends React.Component {
    render() {
        return <footer className="footer">
            <div className="container-fluid">
                <div className="row text-muted">
                    <div className="col-6 text-start">
                        <p className="mb-0">
                            <a
                                className="text-muted"
                                href="https://www.startuptech.uk/"
                                target="_blank"
                                rel="noreferrer"
                            ><strong>&copy; Startup Tech Consultancy LTD, UK</strong></a
                            >

                        </p>
                    </div>
                    <div className="col-6 text-end">
                    </div>
                </div>
            </div>
        </footer>;
    }
}

export default Footer;