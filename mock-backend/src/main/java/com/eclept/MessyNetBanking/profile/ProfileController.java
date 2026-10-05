package com.eclept.MessyNetBanking.profile;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.eclept.MessyNetBanking.auth.DemoUser;
import com.eclept.MessyNetBanking.profile.ProfileDtos.ProfileEnvelope;
import com.eclept.MessyNetBanking.profile.ProfileDtos.UserProfile;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@Tag(name = "profile")
public class ProfileController {

    private final DemoUser user;

    public ProfileController(DemoUser user) {
        this.user = user;
    }

    @GetMapping("/usr/profile")
    @Operation(summary = "User profile",
            description = "Wrapped in `USER`. Keys are PascalCase (`FirstName`) except `eMail` and `lastLogin`. "
                    + "`lastLogin` is epoch seconds **as a string**. `Phone` has no spaces.")
    public ProfileEnvelope profile() {
        return new ProfileEnvelope(new UserProfile(DemoUser.FIRST_NAME, DemoUser.LAST_NAME, DemoUser.EMAIL,
                DemoUser.PHONE.replace(" ", ""), Long.toString(user.lastLoginEpochSeconds())));
    }
}
