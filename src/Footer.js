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
                            ><strong>Startup Tech Consultancy LTD, UK</strong></a
                            >
  &copy;
</p>
                    </div>
                    <div className="col-6 text-end">
                        <ul className="list-inline">
                            <li className="list-inline-item">
                                <a
                                    className="text-muted"
                                    href="https://adminkit.io/"
                                    target="_blank"
                                    rel="noreferrer"
                                >Support</a
                                >
                            </li>
                            <li className="list-inline-item">
                                <a
                                    className="text-muted"
                                    href="https://adminkit.io/"
                                    target="_blank"
                                    rel="noreferrer"
                                >Help Center</a
                                >
                            </li>
                            <li className="list-inline-item">
                                <a
                                    className="text-muted"
                                    href="https://adminkit.io/"
                                    target="_blank"
                                    rel="noreferrer"
                                >Privacy</a
                                >
                            </li>
                            <li className="list-inline-item">
                                <a
                                    className="text-muted"
                                    href="https://adminkit.io/"
                                    target="_blank"
                                    rel="noreferrer"
                                >Terms</a
                                >
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </footer>;
    }
}

export default Footer;