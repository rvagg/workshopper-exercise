const chalk = require('chalk')
const split = require('split')
const tuple = require('tuple-stream')
const through2 = require('through2')
const wcstring = require('wcstring')

function comparestdout (exercise) {
  return exercise.addProcessor(processor)
}

function colourfn (type) {
  return type === 'PASS' ? chalk.green : chalk.red
}

function repeat (ch, sz) {
  return new Array(sz + 1).join(ch)
}

function center (s, sz) {
  const sps = Math.floor((sz - wcstring(s).size()) / 2)
  const sp = repeat(' ', sps)
  return sp + s + sp + (sp.length !== sps ? ' ' : '')
}

function wrap (s_, n) {
  const s = String(s_)
  return s + repeat(' ', Math.max(0, n + 1 - wcstring(s).size()))
}

function processor (mode, callback) {
  this.submissionChild.stderr.pipe(process.stderr)

  if (mode === 'run' || !this.solutionChild) {
    // no compare needed
    this.submissionStdout.pipe(process.stdout)
    return this.on('executeEnd', function () {
      callback(null, true)
    })
  }

  let equal = true
  let line = 1
  const outputStream = through2.obj(transform.bind(this), flush.bind(this))

  function transform (chunk, enc, callback) {
    if (line === 1) {
      outputStream.push('\n' + this.__('compare.title') + '\n\n')

      if (!this.longCompareOutput) { outputStream.push(chalk.yellow(center(this.__('compare.actual'), 40) + center(this.__('compare.expected'), 40) + '\n')) }

      outputStream.push(chalk.yellow(repeat('\u2500', 80)) + '\n\n')
    }

    const eq = chunk[0] === chunk[1]
    const lineStr = wrap(String(line++ + '.'), 3)
    const _colourfn = colourfn(eq ? 'PASS' : 'FAIL')
    const actual = chunk[0] == null ? '' : JSON.stringify(chunk[0])
    const expected = chunk[1] == null ? '' : JSON.stringify(chunk[1])
    let output

    equal = equal && eq

    if (this.longCompareOutput) {
      output =
          chalk.yellow(wrap(lineStr + this.__('compare.actual') + ':', 14)) +
        _colourfn(actual) +
        '\n' +
        chalk.yellow(wrap(lineStr + this.__('compare.expected') + ':', 14)) +
        _colourfn(expected) +
        '\n\n'
    } else {
      output =
          // _colourfn(lineStr)
          '   ' +
        _colourfn(wrap(actual, 34)) +
        _colourfn(chalk.bold(eq ? ' == ' : ' != ')) +
        '   ' +
        _colourfn(wrap(expected, 34)) +
        '\n'
    }

    callback(null, output)
  }

  function flush (_callback) {
    outputStream.push('\n' + chalk.yellow(repeat('\u2500', 80)) + '\n\n')

    this.emit(equal ? 'pass' : 'fail', this.__(equal ? 'compare.pass' : 'compare.fail'))

    _callback(null)

    callback(null, equal) // process() callback
  }

  tuple(this.submissionStdout.pipe(split()), this.solutionStdout.pipe(split()))
    .pipe(outputStream)
    .pipe(process.stdout)
}

module.exports = comparestdout
