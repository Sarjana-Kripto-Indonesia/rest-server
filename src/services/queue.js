const Queue = require('bee-queue')

/**
 * @todo Improvement to add queue emitters are possible in our flow
 */
const queueFunctions = {
  /**
   * Auth signup
   */
  authSignup: (userId) => {},

  /**
   * Auth verify email
   */
  authEmailVerify: (userId) => {}
}

// ------------------------------------------------

const queueOptions = {
  redis: {
    url: process.env.REDIS_URL
  }
}

/**
 * Send email to user with template
 * 
 * @param {object} data 
 */
const sendEmail = (data) => {
  const emailNotification = new Queue('email_queue', queueOptions)
  const job = emailNotification.createJob(data)
  
  job.save()
  job.on('succeeded', (result) => {
    console.log(`Queue: Received result for sending email with job id #${job.id}`, result)
  })
}

/**
 * Send telegram message to user
 * 
 * @param {object} data 
 */
const sendTelegram = (data) => {
  const telegramNotification = new Queue('telegram_queue', queueOptions)
  const job = telegramNotification.createJob(data)
  
  job.save()
  job.on('succeeded', (result) => {
    console.log(`Queue: Received result for send telegram with job id #${job.id}`, result)
  })
}

const processWithdraw = (data) => {
  const withdrawQueue = new Queue('withdraw_queue', queueOptions)
  const job = withdrawQueue.createJob(data)
  
  job.save()
  job.on('succeeded', (result) => {
    console.log(`Queue: Received result for process withdraw with job id #${job.id}`, result)
  })
}

const writeNotification = (data) => {
  const notificationQueue = new Queue('notification_queue', queueOptions);
  const job = notificationQueue.createJob(data);
  job.save();
  
  job.on('succeeded', (result) => {
    console.log('result q', result);
    console.log(`Queue: Received result for process write notification with job id #${job.id}`, result)
  })
}

const writeLog = (data) => {
  const logQueue = new Queue('log_queue', queueOptions);
  const job = logQueue.createJob(data);
  job.save();

  job.on('succeeded', (result) => {
    console.log('result q', result);
    console.log(`Queue: Received result for process write logs with job id #${job.id}`, result)
  })
}

const writeNewsLetters = (data) => {
  const newsletterQueue = new Queue('newsletters', queueOptions);
  const job = newsletterQueue.createJob(data);
  job.save();

  console.log('job', job);
  job.on('succeeded', (result)=>{
    console.log('result q newsletter', result);
    console.log(`Queue: Received result for process write newsletter with job id #${job.id}`, result)
  })
}
module.exports = {
  sendEmail,
  sendTelegram,
  processWithdraw,
  writeNotification,
  writeLog,
  writeNewsLetters
}