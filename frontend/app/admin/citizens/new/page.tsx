import {CitizenForm} from "@/components/forms/citizen-form";import {PageHeader} from "@/components/shared/page-header";
export default function NewCitizenPage(){return <><PageHeader title="Add citizen" description="Register a citizen with the full demographic profile required by the survey."/><CitizenForm mode="create"/></>}
