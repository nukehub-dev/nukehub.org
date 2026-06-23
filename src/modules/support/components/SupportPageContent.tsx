import * as React from "react";
import { ContactModal } from "@components/shared/ContactModal";
import { ImpactSection } from "@modules/support/components/ImpactSection";
import { SupportMethods } from "@modules/support/components/SupportMethods";
import { SponsorshipTiers } from "@modules/support/components/SponsorshipTiers";
import { CustomTier } from "@modules/support/components/CustomTier";
import { OneTimeDonation } from "@modules/support/components/OneTimeDonation";
import { ContactCTA } from "@modules/support/components/ContactCTA";
import type { SupportData } from "@modules/support/types";

interface SupportPageContentProps {
  data: SupportData;
}

export function SupportPageContent({ data }: SupportPageContentProps) {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [defaultInquiryType, setDefaultInquiryType] = React.useState("");

  const openContact = (inquiryType: string = "") => {
    setDefaultInquiryType(inquiryType);
    setIsModalOpen(true);
  };

  return (
    <>
      <ImpactSection items={data.impacts} />
      <SupportMethods methods={data.methods} onContactClick={openContact} />
      <SponsorshipTiers tiers={data.tiers} onContactClick={openContact} />
      <CustomTier tier={data.customTier} onContactClick={openContact} />
      <OneTimeDonation
        data={data.oneTimeDonation}
        onContactClick={openContact}
      />
      <ContactCTA
        title={data.contact.title}
        description={data.contact.description}
        primaryText={data.contact.primaryText}
        secondaryText={data.contact.secondaryText}
        secondaryHref={data.contact.secondaryHref}
        onContactClick={() => openContact()}
      />
      <ContactModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultInquiryType={defaultInquiryType}
      />
    </>
  );
}
