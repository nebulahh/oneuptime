import { PostgresAppInstance } from 'CommonServer/Infrastructure/PostgresDatabase';
import Redis from 'CommonServer/Infrastructure/Redis';
import logger from 'CommonServer/Utils/Logger';
import App from 'CommonServer/Utils/StartServer';
import { QueueJob, QueueName } from 'CommonServer/Infrastructure/Queue';
import QueueWorker from 'CommonServer/Infrastructure/QueueWorker';

// Payments.
import './Jobs/PaymentProvider/CheckSubscriptionStatus';

// Announcements.
import './Jobs/Announcement/SendEmailToSubscribers';

// Incidents
import './Jobs/Incident/SendEmailToSubscribers';

// Incident Notes
import './Jobs/IncidentPublicNote/SendEmailToSubscribers';

// Scheduled Event
import './Jobs/ScheduledMaintenance/ChangeStateToOngoing';
import './Jobs/ScheduledMaintenance/SendEmailToSubscribers';

// Scheduled Event Notes
import './Jobs/ScheduledMaintenancePublicNote/SendEmailToSubscribers';

// Certs Routers
import StausPageCerts from './Jobs/StatusPageCerts/StausPageCerts';

// Express
import Express, { ExpressApplication } from 'CommonServer/Utils/Express';
import JobDictonary from './Utils/JobDictionary';

const APP_NAME: string = 'workers';

const app: ExpressApplication = Express.getExpressApp();

//cert routes.
app.use(`/${APP_NAME.toLocaleLowerCase()}`, StausPageCerts);

const init: Function = async (): Promise<void> => {
    try {
        // init the app
        await App(APP_NAME);
        // connect to the database.
        await PostgresAppInstance.connect(
            PostgresAppInstance.getDatasourceOptions()
        );

        // connect redis
        await Redis.connect();

        // Job process.
        QueueWorker.getWorker(
            QueueName.Worker,
            async (job: QueueJob) => {
                const name: string = job.name;

                logger.info('Running Job: ' + name);

                const funcToRun: Function = JobDictonary.getJobFunction(name);

                if (funcToRun) {
                    await funcToRun();
                }
            },
            { concurrency: 10 }
        );
    } catch (err) {
        logger.error('App Init Failed:');
        logger.error(err);
    }
};

init();
