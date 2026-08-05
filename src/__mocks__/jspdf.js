// Manual mock for jsPDF — prevents canvas/browser PDF APIs from loading in Jest.
// Methods sit on the prototype; instances inherit them without constructor body execution.
const MockJsPDF = jest.fn(function () {
    this.internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
});

MockJsPDF.prototype.setFont = jest.fn();
MockJsPDF.prototype.setFontSize = jest.fn();
MockJsPDF.prototype.setTextColor = jest.fn();
MockJsPDF.prototype.setFillColor = jest.fn();
MockJsPDF.prototype.setDrawColor = jest.fn();
MockJsPDF.prototype.setLineWidth = jest.fn();
MockJsPDF.prototype.text = jest.fn();
MockJsPDF.prototype.line = jest.fn();
MockJsPDF.prototype.rect = jest.fn();
MockJsPDF.prototype.addPage = jest.fn();
MockJsPDF.prototype.setPage = jest.fn();
MockJsPDF.prototype.getNumberOfPages = jest.fn().mockReturnValue(1);
MockJsPDF.prototype.getTextWidth = jest.fn().mockReturnValue(20);
MockJsPDF.prototype.splitTextToSize = jest.fn((t) => [t]);
MockJsPDF.prototype.save = jest.fn();

module.exports = MockJsPDF;
module.exports.default = MockJsPDF;
