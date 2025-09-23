import puppeteer, { Page } from "puppeteer"
import { WebhookClient } from "discord.js"

type MailingList = [string, string]
type AlphabeticalList = MailingList[]
interface MailingAList {
    [key: string]: string
}
const sympaServer = ""
const webhookUrl = ""
const userAgent = ""

const webhook = new WebhookClient({ url: webhookUrl })
let lists: MailingAList = {}

function getMailingLists(page: Page): Promise<MailingList[]> {
    return new Promise((resolve, reject) => {
        page.goto(`https://${sympaServer}/sympa/lists`, { waitUntil: "networkidle0" })
            .then(_ => page)
            .then(page => page.evaluate(() =>
                Array.from(document.querySelectorAll("article"))
                    .map(article => article.querySelector("ul")?.children)
                    .filter(article => article != null)
                    .map(article => Array.from(article)
                        .filter(instance => instance != null)
                        .map(instance => [instance.querySelector("p")?.innerText, instance.querySelector("a")?.innerText]))))
            .then(lists => lists.map(inner => inner.map(inner2 => inner2.filter(inner3 => inner3 != null))) as AlphabeticalList[])
            .then(mailingLists => mailingLists.flat())
            .then(resolve)
            .catch(reject)
    })
}

puppeteer.launch({ headless: true })
    .then(browser => browser.newPage())
    .then(async page => {
        return page.setViewport({
            width: 1920,
            height: 1080
        }).then(_ => page.setUserAgent({ userAgent: userAgent }).then(_ => page))
    })
    .then(page => {
        let func = () => getMailingLists(page).then(mailingLists => {
            if (Object.keys(lists).length == 0) mailingLists.forEach(list => lists[list[1]] = list[0])
            else {
                mailingLists.forEach(list => {
                    if (!lists.hasOwnProperty(list[1])) webhook.send({ content: `**New Mailing List**\n\n[${list[1]}](mailto:${list[1]})\n${list[0]}` })
                    lists[list[1]] = list[0]
                })
            }
        })
        func().then(_ => setInterval(func, 60000))
    })
