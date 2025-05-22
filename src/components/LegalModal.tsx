import React from 'react';
import { X } from 'lucide-react';

type LegalModalProps = {
  isOpen: boolean;
  onClose: () => void;
  type: 'terms' | 'privacy';
};

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, type }) => {
  if (!isOpen) return null;

  const title = type === 'terms' ? 'Terms of Use' : 'Privacy Policy';
  const content = type === 'terms' ? termsContent : privacyContent;

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-start p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-gray-900 rounded-xl max-w-3xl w-full relative border border-gold/30 my-8">
        {/* Background design element */}
        <div className="absolute inset-0 overflow-hidden z-0 opacity-20">
          <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-gold/30 blur-2xl"></div>
          <div className="absolute -left-20 -bottom-20 w-64 h-64 rounded-full bg-gold/20 blur-2xl"></div>
        </div>
        
        {/* Close button */}
        <button 
          onClick={onClose}
          onMouseDown={(e) => e.preventDefault()}
          type="button"
          className="absolute top-4 right-4 text-gray-400 hover:text-white z-50 p-1"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>
        
        {/* Content */}
        <div className="relative z-10">
          <div className="py-6 px-8 border-b border-gray-800">
            <h2 className="text-2xl font-bold text-gold">{title}</h2>
          </div>
          
          <div className="p-8 max-h-[70vh] overflow-y-auto">
            <div 
              className="text-gray-300 space-y-4"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const termsContent = `
<h1 class="text-3xl font-bold text-gold mb-8">Terms of Use</h1>

<strong class="text-2xl text-gold block mb-4">Introduction</strong><br/>
U Limo ("U Limo", "we", or "us") sells reservations for travel and transportation services provided by independently owned and operated third party transportation vendors. U Limo is NOT the provider of transportation or travel. The term "you" refers to the customer visiting our website, calling our customer service agents, or booking a reservation through us, and the term "Customer" refers to you and other customers of U Limo. Our "Service(s)" refers to the selling of reservations for travel and transportation services provided by independently owned and operated third party transportation vendors, however the reservation is made, including but not limited to telephone reservation or online reservation. Our Services are offered to you conditioned upon your acceptance without modification of the terms and conditions set forth herein (collectively, the "Terms").<br/><br/>

<strong class="text-2xl text-gold block mb-4">Acceptance of the Terms of Use</strong><br/>
Please read the Terms of Use carefully before using the Services. By accessing our website, calling our customer service agents, booking any transportation through us, or otherwise using the Services, you accept and agree to be bound and abide by these Terms of Use, and the Privacy Policy incorporated herein by reference. If you do not want to agree to these Terms of Use, you must not access or use the Services.<br/><br/>

The Services are offered and available to users who are [17] years of age or older and reside in the United States or any of its territories or possessions. In order to accept these Terms of Use and use the Services, you must be a resident of the United States and be at least [17] years of age (the "Minimum Age"). The Services are not intended for users under the Minimum Age. You hereby affirmatively represent that:<br/>
(a) you are at least the Minimum Age;<br/>
(b) you have all the applicable rights and authority to grant U Limo the rights granted herein; and<br/>
(c) you have read, understood, and agree to be bound by these Terms of Use.<br/><br/>

<strong class="text-2xl text-gold block mb-4">Disclaimer of Warranties</strong><br/>
U Limo makes no warranty of any kind regarding the transportation or travel services provided by the transportation vendors with whom reservations are booked, the website, or its content, all of which are provided on an "AS IS" basis. U Limo expressly disclaims any representation or warranty that the Services or the transportation or travel services or the website or its content will be free from errors, viruses or other harmful components, that communications to or from U Limo will be secure and not intercepted, that the Services or the website will be uninterrupted, or that its content will be accurate, complete or timely.<br/><br/>

<strong class="text-2xl text-gold block mb-4">Limitations on Liability</strong><br/>
Neither U Limo (including its affiliates and personnel) nor any other party involved in creating, producing, or delivering the Services will be liable for any incidental, special, exemplary or consequential damages, or for any damages for personal or bodily injury or emotional distress arising out of or in connection with:<br/>
(i) these Terms<br/>
(ii) the use of or inability to use the Services<br/>
(iii) any communications or interactions you may have with someone you interact or meet with through, or as a result of, your use of the Services<br/><br/>

<strong class="text-gold">Important:</strong> In no event will U Limo's aggregate liability for any claim or dispute exceed three hundred U.S. dollars (US$300).<br/><br/>

<strong class="text-gold block mb-4">Additional Liability Terms</strong><br/>
These limitations of liability and damages are fundamental elements of the agreement between you and U Limo. If applicable law does not allow the limitations of liability set out in these Terms, the above limitations may not apply to you.<br/><br/>

Subject to applicable law, your use of our Services, this website and its content and any travel and transportation you purchase through our Services is at your sole risk. Services and products made available through our Services and this website are subject to conditions imposed by the travel and transportation providers, including but not limited to tariffs, conditions of carriage, international conventions and arrangements, and federal government regulations.<br/><br/>

<strong class="text-gold">Important:</strong> Travel and transportation providers who furnish products or services through our Services or this website are independent contractors, and not agents or employees of Provider.<br/><br/>

<strong class="text-gold block mb-4">Limitation of Liability Details</strong><br/>
NONE OF U LIMO'S OFFICERS, CORPORATE PARTNERS OR SUBSIDIARIES, OR EMPLOYEES SHALL BE LIABLE TO ANY PARTY FOR ANY DIRECT, INDIRECT, SPECIAL OR OTHER CONSEQUENTIAL DAMAGES FOR ANY USE OF THE SERVICES, including, without limitation, whether based in contract, tort, negligence, strict liability or otherwise, that arises out of or is in any way connected with:<br/>
(i) any use of, browsing or downloading of any part of our site or content<br/>
(ii) any failure or delay (including without limitation the use of or inability to use any component of this site for reservations or ticketing)<br/>
(iii) the performance or non performance by us or any travel or transportation provider<br/>
(iv) any damages or injury caused by any failure of performance, error, omission, interruption, deletion, defect, delay in operation or transmission, computer virus, communication line failure, theft or destruction or unauthorized access to, alteration of, or use of record<br/><br/>

<strong class="text-gold">Note:</strong> If, despite the limitation above, U Limo is found liable for any loss or damage, then U Limo's liability will in no event exceed, in total, the sum of US$300.00. Some states do not allow the limitation of liability, so the limitations above may not apply to you.<br/><br/>

<strong class="text-2xl text-gold block mb-4">Important Notice About Arbitration</strong><br/>
<div class="bg-gold/10 p-4 rounded-lg mb-6">
THESE TERMS REQUIRE THE USE OF ARBITRATION ON AN INDIVIDUAL BASIS TO RESOLVE DISPUTES, RATHER THAN JURY TRIALS OR CLASS ACTIONS, AND ALSO LIMITS THE REMEDIES AVAILABLE TO YOU IN THE EVENT OF A DISPUTE. PLEASE CAREFULLY REVIEW SECTION 10 BELOW FOR MORE INFORMATION.
</div>

<strong class="text-2xl text-gold block mb-4">Changes to the Terms of Use</strong><br/>
We may revise and update these Terms of Use from time to time in our sole discretion. All changes are effective immediately when we post them and apply to all access to and use of the Services thereafter. However, any changes to the dispute resolution provisions set out in Section 10 will not apply to any disputes for which the parties have actual notice before the date the change is posted to the U Limo website.<br/><br/>

Your continued use of the Services following the posting of revised Terms of Use means that you accept and agree to the changes. You are expected to review these Terms from time to time so you are aware of any changes, as they are binding on you.<br/><br/>

<strong class="text-2xl text-gold block mb-4">Intellectual Property Rights</strong><br/>
The website and its entire contents, features, and functionality (including but not limited to all information, software, text, displays, images, video, and audio, and the design, selection, and arrangement thereof) are owned by U Limo, its licensors, or other providers of such material and are protected by United States and international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.<br/><br/>

<strong class="text-gold block mb-4">Trademarks</strong><br/>
"U Limo" and [●] [(the "Marks") are the registered or common law trademarks or service marks of U Limo. These Marks may not be copied, downloaded, reproduced, used, modified, or distributed in any way without prior written permission from U Limo. Other marks that appear on the website are the property of their respective owners.<br/><br/>

<strong class="text-2xl text-gold block mb-4">Privacy Policy</strong><br/>
Your use of the Services is subject to our Privacy Policy. You agree that you have read our Privacy Policy, and it is reasonable and acceptable to you. Your acceptance of this Agreement is also your consent to the information practices in our Privacy Policy.<br/><br/>

<strong class="text-2xl text-gold block mb-4">Alcohol Policy</strong><br/>
Local drinking laws apply to your use of the Services. Customers assume all responsibility associated with the consumption of alcohol while in the limousine. Neither U Limo nor the Chauffeur or Driver will supply or purchase alcohol for Customers.<br/><br/>

<strong class="text-gold">Important:</strong> U Limo has a zero-tolerance policy with respect to underage drinking. If a chauffeur or driver observes underage drinking, they may terminate the trip with no refunds and the minors will be dropped off in a safe location.<br/><br/>

<strong class="text-2xl text-gold block mb-4">Behavior</strong><br/>
Illegal activities, rough behavior, sexual activities or lewd acts are not allowed in the U Limo vehicles at any time and will result in termination of service with no refunds. The law enforcement authorities will be notified if appropriate.<br/><br/>

<strong class="text-2xl text-gold block mb-4">Arbitration</strong><br/>
Except for a claim by U Limo of infringement or misappropriation of U Limo's patent, copyright, trademark, or trade secret, any and all disputes between you and U Limo arising under or related in any way to these Terms must be resolved through binding arbitration as described in this section. This agreement to arbitrate is intended to be interpreted broadly. It includes, but is not limited to, all claims and disputes relating to your use of the Services.<br/><br/>

<div class="bg-gold/10 p-4 rounded-lg mb-6">
YOU AGREE THAT BY ENTERING INTO THESE TERMS, YOU AND U LIMO ARE EACH WAIVING THE RIGHT TO TRIAL BY JURY OR TO PARTICIPATE IN A CLASS ACTION. YOU AND U LIMO AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY, AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE PROCEEDING. ANY ARBITRATION WILL TAKE PLACE ON AN INDIVIDUAL BASIS; CLASS ARBITRATIONS AND CLASS ACTIONS ARE NOT PERMITTED.
</div>

<strong class="text-gold block mb-4">Arbitration Terms:</strong><br/>
(a) Any and all controversies, disputes, demands, counts, claims, or causes of action (including the interpretation and scope of this clause, and the arbitrability of the controversy, dispute, demand, count, claim, or cause of action) between you and us and our employees, agents, successors, or assigns, regarding or relating to the Services or these Terms shall exclusively be settled through binding and confidential arbitration.<br/><br/>

(b) Arbitration shall be subject to the Federal Arbitration Act and not any state arbitration law. The arbitration shall be conducted before one commercial arbitrator with substantial experience in resolving commercial contract disputes from the American Arbitration Association ("AAA"). As modified by these Terms, and unless otherwise agreed upon by the parties in writing, the arbitration will be governed by the AAA's rules for commercial arbitration and, if the arbitrator deems them applicable, the procedures for consumer-related disputes.<br/><br/>

<div class="bg-gold/10 p-4 rounded-lg mb-6">
(c) You are thus GIVING UP YOUR RIGHT TO GO TO COURT to assert or defend your rights EXCEPT for matters that may be taken to small claims court. Your rights will be determined by a NEUTRAL ARBITRATOR and NOT a judge or jury. You are entitled to a FAIR HEARING, BUT the arbitration procedures are SIMPLER AND MORE LIMITED THAN RULES APPLICABLE IN COURT. Arbitrator decisions are as enforceable as any court order and are subject to VERY LIMITED REVIEW BY A COURT.
</div>

<strong class="text-gold block mb-4">Arbitration Rules:</strong><br/>
You and we must abide by the following rules:<br/>
(1) any claims brought by you or us must be brought in the parties' individual capacity, and not as a plaintiff or class member in any purported class or representative proceeding;<br/>
(2) the arbitrator may not consolidate more than one person's claims;<br/>
(3) in the event that you are able to demonstrate that the costs of arbitration will be prohibitive as compared to costs of litigation, we will pay as much of your filing and hearing fees in connection with the arbitration as the arbitrator deems necessary;<br/>
(4) we also reserve the right in our sole and exclusive discretion to assume responsibility for all of the costs of the arbitration;<br/>
(5) the arbitrator shall honor claims of privilege and privacy recognized at law;<br/>
(6) the arbitrator's award shall be final and may be enforced in any court of competent jurisdiction;<br/>
(7) the arbitrator may award any individual relief or individual remedies that are permitted by applicable law;<br/>
(8) each side pays its own attorneys' fees and expenses unless there is a statutory provision that requires the prevailing party to be paid its fees' and litigation expenses.<br/><br/>

(e) Notwithstanding the foregoing, either you or we may bring an individual action in small claims court. Further, claims of infringement or misappropriation of the other party's patent, copyright, trademark, or trade secret shall not be subject to this arbitration agreement. Such claims shall be exclusively brought in the state or federal courts located in New York, New York. Additionally, notwithstanding these Terms to arbitrate, either party may seek emergency equitable relief before the state or federal courts located in New York, New York in order to maintain the status quo pending arbitration, and hereby agree to submit to the exclusive personal jurisdiction of the courts located within New York, New York for such purpose. A request for interim measures shall not be deemed a waiver of the right to arbitrate.<br/><br/>

(f) With the exception of subparts (1) and (2) in Section 9(d) above (prohibiting arbitration on a class or collective basis), if any part of this arbitration provision is deemed to be invalid, unenforceable or illegal, or otherwise conflicts with the Agreement, then the balance of this arbitration provision shall remain in effect and shall be construed in accordance with its terms as if the invalid, unenforceable, illegal or conflicting provision were not contained herein. If, however, either subparts (1) and (2) in such section (prohibiting arbitration on a class or collective basis) is found to be invalid, unenforceable or illegal, then the entirety of this arbitration provision shall be null and void, and neither you nor we shall be entitled to arbitration. If for any reason a claim proceeds in court rather than in arbitration, the dispute shall be exclusively brought in state or federal court in New York, New York.<br/><br/>

(g) Notwithstanding any provision in these Terms to the contrary, if we seek to terminate the Dispute Resolution section as included in these Terms, any such termination shall not be effective until 30 days after the version of these Terms not containing the agreement to arbitrate is posted to the website, and shall not be effective as to any claim of which you provided us with written notice prior to the date of termination.<br/><br/>

<strong class="text-2xl text-gold block mb-4">Limit of Time to File</strong><br/>
<div class="bg-gold/10 p-4 rounded-lg mb-6">
ANY CAUSE OF ACTION OR CLAIM YOU MAY HAVE ARISING OUT OF OR RELATING TO THESE TERMS OF USE OR THE SERVICES MUST BE COMMENCED WITHIN ONE (1) YEAR AFTER THE CAUSE OF ACTION ACCRUES; OTHERWISE, SUCH CAUSE OF ACTION OR CLAIM IS PERMANENTLY BARRED.
</div>

<strong class="text-2xl text-gold block mb-4">Indemnification</strong><br/>
To the maximum extent permitted by applicable law, you agree to release, defend (at U Limo's option), indemnify, and hold U Limo (including U Limo's affiliates, and their personnel) harmless from and against any claims, liabilities, damages, losses, and expenses, including, without limitation, reasonable legal and accounting fees, arising out of or in any way connected with:<br/>
(i) your breach of these Terms<br/>
(ii) your improper use of the Services<br/>
(iii) your interaction with any Customer, including without limitation any injuries, losses or damages<br/>
(iv) your breach of any laws, regulations or third party rights<br/><br/>

<strong class="text-2xl text-gold block mb-4">Interpreting these Terms</strong><br/>
Except as they may be supplemented by additional terms, conditions, policies, guidelines, standards, and in-product disclosures, these Terms constitute the entire agreement between U Limo and you pertaining to your access to or use of the Services and supersede any and all prior oral or written understandings or agreements between U Limo and you. These Terms do not and are not intended to confer any rights or remedies upon anyone other than you and U Limo. If any provision of these Terms is held to be invalid or unenforceable, such provision will be struck and will not affect the validity and enforceability of the remaining provisions.<br/><br/>

<strong class="text-2xl text-gold block mb-4">No Waiver</strong><br/>
U Limo's failure to enforce any right or provision in these Terms will not constitute a waiver of such right or provision unless acknowledged and agreed to by us in writing. Except as expressly set forth in these Terms, the exercise by either party of any of its remedies under these Terms will be without prejudice to its other remedies under these Terms or otherwise permitted under law.<br/><br/>

<strong class="text-2xl text-gold block mb-4">Assignment</strong><br/>
You may not assign, transfer or delegate this agreement or your rights and obligations hereunder without U Limo's prior written consent. U Limo may without restriction assign, transfer or delegate this agreement and any rights and obligations hereunder, at its sole discretion, with 30 days' prior notice. Your right to terminate this agreement at any time pursuant to applicable policy remains unaffected.<br/><br/>

<strong class="text-2xl text-gold block mb-4">Notice</strong><br/>
Unless specified otherwise, any notices or other communications to Customers permitted or required under this agreement, will be provided electronically on the U Limo website and given by U Limo via email, messaging service (including SMS), or any other contact method we enable you to provide.<br/><br/>

<strong class="text-2xl text-gold block mb-4">Third-Party Services</strong><br/>
The website may contain links to third-party websites, applications, services or resources ("Third-Party Services") that are subject to different terms and privacy practices. U Limo is not responsible or liable for any aspect of such Third-Party Services and links to such Third-Party Services are not an endorsement.<br/><br/>`;

const privacyContent = `
<h1 class="text-3xl font-bold text-gold mb-8">Privacy Policy</h1>

<strong class="text-2xl text-gold block mb-4">Introduction</strong><br/>
Our privacy policy describes how we collect, use, protect and disclose personal information that we receive from users of our website or services. We value your privacy and are committed to protecting your personal information.<br/><br/>

<strong class="text-2xl text-gold block mb-4">Collection of Personal Information</strong><br/>
We may collect personal information such as your name, email address, mailing address, phone number, and payment information when you use our website or services. We collect this information when you voluntarily provide it to us through our website or when you communicate with us via email or phone.<br/><br/>

<strong class="text-2xl text-gold block mb-4">Use of Personal Information</strong><br/>
We use personal information to provide our services to you, respond to your inquiries, and communicate with you about your account or our services. We may also use your personal information for marketing purposes, such as sending you newsletters or promotional materials.<br/><br/>

<strong class="text-gold">Third-Party Service Providers:</strong> We may use third-party service providers to help us operate our business or provide services to you. These service providers may have access to your personal information, but they are required to keep it confidential and secure.<br/><br/>

<strong class="text-2xl text-gold block mb-4">Protection of Personal Information</strong><br/>
We take reasonable measures to protect your personal information from unauthorized access, disclosure, alteration, or destruction. We use industry-standard security practices and procedures to safeguard your personal information.<br/><br/>

<strong class="text-2xl text-gold block mb-4">Disclosure of Personal Information</strong><br/>
We may disclose personal information to comply with a legal obligation, protect our rights or property, or enforce our policies. We may also disclose personal information to third-party service providers who assist us in providing services to you.<br/><br/>

<strong class="text-gold">Important:</strong> We do not sell or rent your personal information to third parties for marketing purposes.<br/><br/>

<strong class="text-2xl text-gold block mb-4">Cookies</strong><br/>
We may use cookies to enhance your experience on our website. Cookies are small files that are stored on your computer or device when you visit our website. We use cookies to improve our website's functionality, analyze website usage, and provide personalized content and advertising.<br/><br/>

<strong class="text-gold">Cookie Settings:</strong> You may choose to disable cookies in your web browser settings. However, disabling cookies may limit your ability to use certain features of our website or services.<br/><br/>

<strong class="text-2xl text-gold block mb-4">Third-Party Links</strong><br/>
Our website may contain links to third-party websites or services. We are not responsible for the privacy practices or content of these third-party websites or services. We encourage you to review the privacy policies of these third-party websites or services before providing any personal information.<br/><br/>

<strong class="text-2xl text-gold block mb-4">Children's Privacy</strong><br/>
Our website and services are not intended for use by children under the age of 13. We do not knowingly collect personal information from children under the age of 13. If you are a parent or guardian and believe that your child has provided us with personal information, please contact us immediately.<br/><br/>

<strong class="text-2xl text-gold block mb-4">Changes to our Privacy Policy</strong><br/>
We may update our privacy policy from time to time. We will notify you of any changes by posting the new privacy policy on our website. You are advised to review this privacy policy periodically for any changes.<br/><br/>

<strong class="text-2xl text-gold block mb-4">Contact Us</strong><br/>
If you have any questions about our privacy policy or the use of your personal information, please contact us by email at <strong class="text-gold">contact@ulimo.co</strong>
`; 